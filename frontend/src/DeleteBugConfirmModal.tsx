import { useEffect, useRef } from "react";

export interface DeleteBugConfirmModalProps {
  /** The bug to delete, as last saved. */
  bug: { id: number; title: string };
  /** True while the delete request is in flight. */
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Asks the user to confirm deleting a bug. Opens on top of the Edit bug modal.
 * Cancel, the X and Escape all cancel; clicking the backdrop does nothing.
 */
export function DeleteBugConfirmModal({
  bug,
  deleting,
  onConfirm,
  onCancel,
}: DeleteBugConfirmModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus Cancel first, so pressing Enter straight away cannot delete the bug.
  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!deleting) onCancel();
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [deleting, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-stone-900/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-bug-confirm-title"
      aria-describedby="delete-bug-confirm-message"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md border border-stone-200">
          <div className="flex items-center justify-between gap-2 px-6 py-4 border-b border-stone-200">
            <h2 id="delete-bug-confirm-title" className="text-lg font-semibold text-stone-800">
              Delete bug #{bug.id}?
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="rounded p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
              aria-label="Close"
              disabled={deleting}
            >
              <span className="sr-only">Close</span>
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className="px-6 py-4 space-y-4">
            <p id="delete-bug-confirm-message" className="text-stone-700">
              Are you sure you want to delete bug #{bug.id} &quot;{bug.title}&quot;? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={onCancel}
                className="rounded px-4 py-2 text-sm font-medium text-stone-700 bg-stone-200 hover:bg-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 disabled:opacity-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="rounded px-4 py-2 text-sm font-medium text-red-700 border border-red-200 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
