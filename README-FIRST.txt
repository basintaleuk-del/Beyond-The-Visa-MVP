DEPLOY ONLY THE FIRST FUNCTION FOR NOW

1. In Supabase, choose Edge Functions > Functions.
2. Click Deploy a new function.
3. Choose Via Editor.
4. Use the function name: zibur-chat
5. Choose the blank or Hello World template.
6. Delete all existing code in the editor.
7. Open 01-zibur-chat.ts from this folder and copy everything.
8. Paste it into the Supabase editor.
9. Click Deploy function.

Do not deploy stripe-webhook through the normal authenticated template. It
needs JWT verification disabled and will be handled separately after Stripe is
configured.
