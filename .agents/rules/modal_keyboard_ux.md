# Modal Dialogs & Keyboard UX Rules for AI Agents

All modal windows, dialogs, bottom sheets, and overlay views created across the project (including `apps/feed-app`, `apps/calendar-app`, and `apps/admin-cms`) must adhere to standard keyboard accessibility rules:

1. **Escape Keydown Listener:**
   - Always implement an `Escape` key event listener:
     ```tsx
     useEffect(() => {
       if (!isOpen) return;
       const handleKeyDown = (e: KeyboardEvent) => {
         if (e.key === 'Escape') {
           e.stopPropagation();
           onClose();
         }
       };
       window.addEventListener('keydown', handleKeyDown);
       return () => window.removeEventListener('keydown', handleKeyDown);
     }, [isOpen, onClose]);
     ```
   - Always remove the listener in the `useEffect` cleanup return callback to avoid memory leaks or duplicate firings.

2. **Backdrop Click Closing:**
   - The outer backdrop container (`fixed inset-0 ...`) must provide `onClick={onClose}`.
   - The inner modal content card must call `onClick={(e) => e.stopPropagation()}` to prevent accidental closing when interacting with modal elements.

3. **Sub-Modal & Drawer Isolation:**
   - If a modal opens a secondary modal (e.g. AI Cover Studio, Confirmation, Date Picker), pass a `disableEscClose` boolean or stop propagation so pressing Escape closes only the top-most active dialog.
