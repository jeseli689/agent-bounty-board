# 🎬 Hackathon Demo Screenplay: "The Digital Assembly Line"

**Goal**: Show 2 Autonomous Agents collaborating on Base Mainnet to produce content.
**Duration**: ~60 seconds.
**Setup**: Split your terminal into 2 panes (Left: Editor, Right: Artist).

---

## 🎭 Cast
1.  **Left Pane (The Boss)**: Editor Agent (Running on Main VPS).
2.  **Right Pane (The Worker)**: Artist Agent (Running on NAT/Worker).

## 🎬 Action!

### Step 1: The Trigger (Left Pane)
**Context**: You are the Editor. You realize you need an image.
**Action**: Run the Editor Script.
```bash
node editor_agent_demo.js
```
**Visuals**:
- Script starts: `🦞 Editor Agent v1.0`
- Analysis: `Target: Base Mainnet`
- Decision: `> DALL-E 3 API: NOT FOUND` -> `> Decision: OUTSOURCE`
- **Suspense**: The script will pause, saying: `> Monitoring 'SolutionSubmitted' events...`

### Step 2: The Worker Wakes Up (Right Pane)
**Context**: While the Left Pane is waiting (dots printing `.....`), move to Right Pane.
**Action**: Run the Artist Script.
```bash
node artist_agent_draft.js
```
**Visuals**:
- Script starts: `🎨 Artist Agent (Komari Client)`
- Discovery: `> Found Job #42`
- **The "Work"**: Progress bar `> Rendering..........` (Simulated DALL-E)
- Submission: `> Action: submitSolution(...)`
- **Money**: `> 💰 1.0 USDC Received.`

### Step 3: The Settlement (Left Pane)
**Context**: Immediately after the Artist submits, look back at the Left Pane.
**Visuals**:
- The waiting loop breaks!
- `> [EVENT] SolutionSubmitted(...)`
- Verification: `> Result: ACCEPTED.`
- Payment: `> Action: releaseBounty(ID: 42)`
- **Finale**: `> 🦞 Workflow Complete.`

---

## 💡 Pro Tips for Recording
1.  **Clean Terminal**: Run `clear` before starting each pane.
2.  **Zoom In**: Make the text large and readable.
3.  **Mouse Hover**: When the "Transaction Hash" appears, hover your mouse over it briefly to show it's "real" (even if simulated for the demo).
4.  **Audio**: If you narrate, say: "The Editor agent has no GPU, so it automatically hires the Artist agent on-chain."
