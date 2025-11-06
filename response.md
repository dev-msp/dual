Perfect! I've successfully changed the keymap allocation priority. The `KEYMAP_SEQUENCE` array in `/Users/matt/code/lang/python/dual/src/pages/Categorize.tsx:262-283` now prioritizes letters (a-l) first, followed by digits (1-9, 0).

**Summary of changes:**
- Changed the priority order from: `1,2,3,4,5,6,7,8,9,0,a,s,d,f,g,h,j,k,l`
- To: `a,s,d,f,g,h,j,k,l,1,2,3,4,5,6,7,8,9,0`
- Updated the comment to reflect the new ordering

This means that when keymaps are allocated to categorization options, the first option will now get 'a', the second will get 's', and so on through the homerow letters, before moving to digits starting with '1'.
