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
    }, 100); 

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

  it('debounces cloud sync calls and updates status', async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ data }) => useAutosave(data, 'modern', 'scratch', user, supabaseMock),
      { initialProps: { data: { name: 'H' } } }
    );

    expect(result.current.saveStatus).toBe('saving');

    await act(async () => {
      rerender({ data: { name: 'Ha' } });
      rerender({ data: { name: 'Har' } });
    });

    // Advance timers
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Wait for the promise to resolve
    await act(async () => {
      await Promise.resolve();
    });
    
    expect(supabaseMock.upsert).toHaveBeenCalledTimes(1);
    expect(result.current.saveStatus).toBe('saved');
    vi.useRealTimers();
  });
});
