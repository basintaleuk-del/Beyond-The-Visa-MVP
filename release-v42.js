.startGuidePlayer{overflow:hidden;border:1px solid var(--line);border-radius:22px;background:var(--card);box-shadow:var(--shadow)}
.startGuideHeading{padding:20px 20px 14px}.startGuideHeading>span{font-size:10px;letter-spacing:.14em;color:var(--teal);font-weight:900}
.startGuideHeading h2{margin:6px 0;font-family:Georgia,serif}.startGuideHeading p{margin:0;color:var(--muted);line-height:1.5}
.startGuideFrame{position:relative;background:#071f23;aspect-ratio:16/9;display:grid;place-items:center}
.startGuideFrame video{display:block;width:100%;height:100%;object-fit:contain;background:#071f23}
.startGuideStatus{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px}
.startGuideStatus span{color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}
.startGuideStatus button{border:0;border-radius:11px;padding:10px 13px;background:var(--mint);color:var(--teal);font-weight:900}
.startGuideStatus button.complete{background:#dff1e8;color:#1c6149}
.startGuideCaptionNote{margin:0;padding:0 18px 18px;color:var(--muted);font-size:11px;line-height:1.5}
body.dark .startGuideStatus button.complete{background:#244438;color:#bcebd5}
@media(max-width:480px){.startGuideHeading{padding:16px 16px 12px}.startGuideStatus{align-items:stretch;flex-direction:column}.startGuideStatus button{width:100%}.startGuideCaptionNote{padding:0 16px 16px}}
