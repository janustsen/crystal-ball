#!/usr/bin/env python3
"""Fresh, read-only Claude graders. Preserve every round, including failures."""
import subprocess,concurrent.futures,pathlib,sys
phase=sys.argv[1];round_=sys.argv[2]
roles=['harsh-product-designer','mobile-ux-reviewer','target-18-24-user']
rubrics={
'research':'Sourced primary evidence 30%, specificity 25%, decision readiness 25%, honest measurement and limitations 20%. Evaluate research artifacts, not a yet-unbuilt app. A candid failure result with a concrete mitigation can be high-quality research. Do not invent measurements. Hosted inference cannot be executed without an authorized key; accept clearly labeled shortlist and replay plan under this constraint.',
'design':'Unified cosmic-mystic thesis 25%, visual polish 25%, interaction and animation specification 25%, accessibility and complete states 25%. Evaluate design artifacts and visual review sheet, not unbuilt implementation.',
'generation':'Definitive specific forecast 20%, evidence groundedness 25%, adaptive question relevance 20%, one-line fit 15%, safety 20%. Inspect runtime evidence and implementation. Future predictive accuracy cannot be measured tonight.',
'app':'End-to-end observed behavior 35%, visual quality from screenshots 30%, accessibility and recovery 20%, performance 15%. Tonight firstmate explicitly authorized Expo web at 390x844 instead of iOS Simulator because Xcode is not installed. Native-only integrations must be wired and tested with mocks, and list deferred device checks honestly.'}
files= {'research':'docs/research/ and docs/design/ui-rules.md','design':'docs/design/','generation':'server/, tests/, docs/evidence/ and docs/research/','app':'app/, src/, docs/evidence/, SETUP.md and .agents/skills/verify-crystal-ball/'}[phase]
def run(role):
 prompt=f'''You are an independent {role} grader for Crystal Ball. You have no builder conversation. Read {files} in this working directory using read-only tools. Start with docs/evidence/verification-summary.md for current evidence references; historical failures remain available and must not be mistaken for current captures. Independently verify the summary against the referenced artifacts. Do not modify files or run commands. Grade the {phase} phase harshly using this rubric: {rubrics[phase]} Give your real score 0-10; >=9 is the requested bar, never inflate to satisfy it. Return JSON with role, phase, score, evidence, blockers (concrete changes needed for >=9), and strengths. For app/design view available images/HTML source as appropriate; distinguish visual inspection from source inspection. Scope: Expo/React Native future-prediction entertainment app, cosmic mystic palette, local Ollama Qwen, no paid APIs or borrowed credentials. Research phase is decision preparation; design phase precedes implementation. Do not demand out-of-scope deployment or actual App Store billing.'''
 output=pathlib.Path(f'docs/grades/{phase}-{round_}-{role}.txt')
 with output.open('w') as f:
  p=subprocess.run(['claude','-p','--model','claude-opus-5-5','--tools','Read,Glob,Grep','--permission-mode','plan'],input=prompt,text=True,stdout=f,stderr=subprocess.STDOUT)
 print(role,p.returncode,flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(run,roles))
