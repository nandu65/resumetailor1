import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { useState, useEffect, useRef } from 'react';

// Mocking the parts we need from the complex component to test the autosave logic in isolation
function useAutosave(
  resumeData: any, 
  template: string, 
  starter: string, 
  user: any, 
  supabase: any
) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<any>(null);

  useEffect(() => {
    if (starter !== "choose" && starter !== "wizard") {
      localStorage.setItem("rs-current-resume", JSON.stringify(resumeData));
      localStorage.setItem("rs-last-edited", new Date().toISOString());
    }

    if (!user || starter === "choose" || starter === "wizard") return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from("resume_drafts")
          .upsert({
            user_id: user.id,
            resume_data: resumeData,
            template_id: template,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (error) throw error;
        setSaveStatus("saved");
      } catch (e) {
        setSaveStatus("error");
      }
    }, 100); // Shorter for tests

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [starter, resumeData, template, user]);

  return { saveStatus };
}

describe('Autosave Feature', () => {
  let supabaseMock: any;
  let user: any;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    user = { id: 'test-user-id' };
    supabaseMock = {
      from: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
  });

  it('saves to localStorage immediately when editing starts', () => {
    const resumeData = { name: 'Harsha' };
    renderHook(() => useAutosave(resumeData, 'modern', 'scratch', user, supabaseMock));

    expect(localStorage.getItem('rs-current-resume')).toBe(JSON.stringify(resumeData));
    expect(localStorage.getItem('rs-last-edited')).toBeTruthy();
  });

  it('debounces cloud sync calls', async () => {
    const { rerender } = renderHook(
      ({ data }) => useAutosave(data, 'modern', 'scratch', user, supabaseMock),
      { initialProps: { data: { name: 'H' } } }
    );

    act(() => {
      rerender({ data: { name: 'Ha' } });
      rerender({ data: { name: 'Har' } });
      rerender({ data: { name: 'Hars' } });
    });

    // Should only have called upsert once after debounce
    vi.advanceTimersByTime(200);
    
    expect(supabaseMock.upsert).toHaveBeenCalledTimes(1);
    expect(supabaseMock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        resume_data: { name: 'Hars' }
      }),
      expect.any(Object)
    );
  });

  it('updates saveStatus correctly', async () => {
    const { result } = renderHook(
      () => useAutosave({ name: 'Harsha' }, 'modern', 'scratch', user, supabaseMock)
    );

    expect(result.current.saveStatus).toBe('saving');

    // Wait for the debounce timer AND the promise resolution
    await act(async () => {
      vi.advanceTimersByTime(200);
      // Wait for any pending promises (the upsert)
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.saveStatus).toBe('saved');
  });
});

