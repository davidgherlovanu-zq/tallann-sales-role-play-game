import { getConfig } from './config.js';
import { transcript } from './state.js';
import { displayScorecard } from './scorecard.js';
import { saveScorecard, logAuditEvent } from './firestore.js';
import { escapeHtml } from './ui.js';

export function buildScoringPrompt(transcriptText) {
  return `You are an expert sales coach using Tom Erb's methodology from "Winning the Staffing Sales Game." You specialize in training staffing industry sales professionals on cold calling, consultative selling, and the 10-week 12-touch prospecting process.

METHODOLOGY OVERVIEW:
Tom Erb's approach is built on these core principles:
- Sales is a CHESS GAME, not a war. The prospect is not the enemy — they are a potential partner.
- Prospects are humans first. Treat every interaction with genuine curiosity and respect.
- The goal of a cold call is NOT to close a deal. It's to START A RELATIONSHIP and earn the right to a next conversation.
- The "One Call Close" is a myth in staffing sales — like Bigfoot. Building real business relationships takes time and multiple touches.
- Credibility is everything. You must quickly establish WHY the prospect should listen to you through proof points: logo clients, data, industry knowledge, testimonials.
- Your value proposition must be both UNIQUE and VALUABLE to the prospect. Generic claims like "we have great people" are worthless.
- The 10-week 12-touch process uses variable repetition (calls, emails, LinkedIn, letters) to systematically build familiarity and trust.

THE LETTER AS ICEBREAKER (OPTIONAL — BONUS IF USED):
Some reps use the 10-week process which includes sending a physical letter to the prospect BEFORE the cold call. This letter:
- Introduces the salesperson and their firm briefly
- Provides a piece of value (insight, data, article) relevant to the prospect's industry
- Does NOT ask for anything or pitch services
- Creates familiarity so when the rep calls, the prospect may recognize the name
- Serves as an effective icebreaker to open the cold call: "Hi [Name], I sent you a letter last week with some data on [topic] — I was curious if you had a chance to see it?"
- This approach LOWERS DEFENSES because you're referencing something you already gave them (not asking for something), and it demonstrates credibility
- The letter makes the call feel like a follow-up rather than a cold intrusion
NOTE: The letter and 10-week process are OPTIONAL tools. If the rep chooses not to use them, do NOT penalize their score. Instead, evaluate their opening on its own merits. If they DO use the letter, give them credit for it.

OPENING PHILOSOPHY:
- AVOID dead-giveaway phrases that instantly trigger "sales call" defenses: "How are you today?", "Did I catch you at a bad time?", "I was just reaching out to...", "Do you have a minute?"
- Instead, be DIRECT and reference a specific reason for calling (this could be the letter, a referral, industry news, or any relevant hook)
- Lower their defenses by leading with something of value (an insight, data, a reference to something you've given them, or a relevant reason for the call)
- The first 10 seconds determine whether the prospect stays on the line — make them count
- Use the reactance principle: people resist being told what to do, so never pressure

DISCOVERY & QUALIFYING:
- Ask smart, persona-based questions that show you understand their world
- Uncover their actual hiring challenges, pain points, and staffing approach
- Listen more than you talk — the best discovery feels like a conversation, not an interrogation
- Questions like "What does your hiring process look like right now?" or "What's your biggest challenge when it comes to finding [role type]?"

CONSULTATIVE VS. TRANSACTIONAL:
- Position yourself as a Talent Advisor, not a vendor
- Think long-haul relationship, not quick transaction
- The "chess not war" philosophy means you're strategically building toward a partnership
- Even if they don't need you today, you want to be the first call when they do

GRADING SCALE (1-10):
- 9-10 "Great!": A high-trust, consultative conversation. Prospect is relaxed, open, and fully engaged. Clear credibility established. Meaningful hiring challenges uncovered. The opening is strong and effectively lowers defenses (whether using the letter, a referral, or another approach). Prospect thinks differently about their staffing approach. Real momentum toward next steps.
- 7-8 "Very Good": Professional, prepared, and confident. Successfully lowers defenses and builds strong rapport. Prospect shares relevant challenges. Rep connects those issues to their staffing solution with clear value. Conversation is meaningful and positions for future engagement. Opening approach is effective.
- 5-6 "Fine": Professional and polite, but surface-level. Does not strongly differentiate the firm. Prospect is somewhat receptive but not highly engaged. Little urgency or emotional connection created. Acceptable but largely forgettable.
- 3-4 "Not So Good": Call feels transactional or scripted. Prospect remains guarded or defensive. Rep focuses more on pitching than understanding. Minimal rapport or credibility. Conversation struggles to gain traction. Dead-giveaway phrases used.
- 1-2 "Poor": Completely unprepared. Cannot articulate value. Prospect noticeably irritated. No rapport, no credibility, no strategy. The opposite of consultative selling.

CONVERSATION TRANSCRIPT TO EVALUATE:
${transcriptText || '(No transcript captured - provide general coaching tips based on the methodology)'}

SCORING CRITERIA — Score each on the 1-10 scale:

1. **Opening & Lowering Defenses**: Did the rep avoid dead-giveaway phrases? Did the opening feel natural and non-threatening? Did it lower the prospect's defenses rather than raise them? Was there a clear, relevant reason for the call? (If the rep referenced a letter, give bonus credit — but do NOT penalize if they chose a different opening approach.)

2. **Rapport & Human Connection**: Did the rep treat the prospect as a human being? Was the tone conversational rather than scripted? Did they build genuine warmth and connection? Did the prospect relax during the conversation?

3. **Credibility & Value Proposition**: Did the rep establish WHY the prospect should listen? Were proof points used (logo clients, data, industry knowledge, testimonials)? Was the value proposition both Unique AND Valuable — not generic?

4. **Discovery & Qualifying**: Did the rep ask smart, persona-based questions? Did they uncover real hiring challenges or staffing pain points? Did they listen actively and follow up on what the prospect shared?

5. **Consultative Approach vs. Transactional**: Did the rep act as a Talent Advisor rather than a vendor? Was this a chess move (strategic, relationship-building) or a war tactic (aggressive, pushy)? Did the rep position for a long-term relationship?

6. **Next Steps & Follow-Up Positioning**: Did the rep establish clear, non-threatening next steps? Did they position for future engagement and follow-up? Was the close appropriate — not too aggressive, not too passive?

Respond with ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "overall_score": <number 1-10>,
  "overall_grade": "<Great!|Very Good|Fine|Not So Good|Poor>",
  "summary": "<2-3 sentence overall assessment referencing the methodology and grading level>",
  "criteria": [
    { "name": "Opening & Lowering Defenses", "score": <number 1-10>, "feedback": "<2-3 sentence specific feedback on the opening approach, dead-giveaway phrases, and defense-lowering techniques. If the letter was used, comment on its effectiveness.>" },
    { "name": "Rapport & Human Connection", "score": <number 1-10>, "feedback": "<2-3 sentence specific feedback on human connection and conversational tone>" },
    { "name": "Credibility & Value Proposition", "score": <number 1-10>, "feedback": "<2-3 sentence specific feedback on proof points and value proposition quality>" },
    { "name": "Discovery & Qualifying", "score": <number 1-10>, "feedback": "<2-3 sentence specific feedback on questions asked and listening quality>" },
    { "name": "Consultative Approach", "score": <number 1-10>, "feedback": "<2-3 sentence specific feedback on advisor positioning and chess-not-war philosophy>" },
    { "name": "Next Steps & Follow-Up", "score": <number 1-10>, "feedback": "<2-3 sentence specific feedback on close quality and follow-up positioning>" }
  ],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "coaching_tip": "<A specific, actionable coaching tip based on Tom Erb's methodology for the rep's next practice session>"
}`;
}

export async function callAnthropic(apiKey, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2500, messages: [{ role: 'user', content: prompt }] })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

export async function callOpenAI(apiKey, prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: prompt }], max_tokens: 2500 })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

export function generateMockScorecard() {
  return {
    overall_score: 7, overall_grade: "Very Good",
    summary: "This is a demo scorecard. Configure your AI API key in Admin Settings to get real analysis powered by Tom Erb's methodology. Scores use the Tallann Resources 1-10 cold call grading scale.",
    criteria: [
      { name: "Opening & Lowering Defenses", score: 7, feedback: "Configure your AI key to get personalized feedback on how well you used the letter as an icebreaker and avoided dead-giveaway phrases." },
      { name: "Rapport & Human Connection", score: 8, feedback: "The AI will evaluate whether you treated the prospect as a human and built genuine conversational warmth." },
      { name: "Credibility & Value Proposition", score: 6, feedback: "Scored on proof points, logo clients, data, and whether your value proposition was both Unique and Valuable." },
      { name: "Discovery & Qualifying", score: 6, feedback: "AI scoring analyzes your persona-based questions and how well you uncovered hiring challenges." },
      { name: "Consultative Approach", score: 7, feedback: "Measures whether you acted as a Talent Advisor using the chess-not-war philosophy." },
      { name: "Next Steps & Follow-Up", score: 8, feedback: "Evaluates your close: clear, non-threatening, and positioned within the 10-week process." }
    ],
    strengths: ["Demo mode — configure AI key in Admin Settings for real analysis", "Scoring based on Tom Erb's 'Winning the Staffing Sales Game'", "Paste your transcript manually if auto-capture misses it"],
    improvements: ["Connect your ElevenLabs agent for live calls", "Add an AI API key for personalized coaching", "Focus on referencing the letter as your icebreaker"],
    coaching_tip: "For your next practice call, start by referencing the letter you sent: 'Hi [Name], I sent you a letter last week with some data on [topic] — did you have a chance to see it?' This immediately lowers defenses because you're following up on something you gave them, not asking for something."
  };
}

export async function generateScorecard() {
  const config = getConfig();
  const apiKey = config ? config.aiApiKey : '';
  const provider = config ? config.aiProvider : 'anthropic';

  const transcriptText = transcript.map(m =>
    `${m.role === 'user' ? 'Sales Rep' : 'Prospect'}: ${m.text}`
  ).join('\n');

  if (!apiKey) {
    const overlay = document.getElementById('scoringOverlay');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const content = document.getElementById('scorecardContent');

    if (overlay) overlay.classList.remove('visible');
    if (statusDot) statusDot.classList.remove('scoring');
    if (statusText) statusText.textContent = 'Setup needed';
    if (content) {
      content.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--text-dim);">
          <div style="font-size:48px; margin-bottom:16px;">&#9881;</div>
          <h3 style="margin-bottom:12px; color:var(--text);">AI Scoring Not Configured</h3>
          <p style="max-width:480px; margin:0 auto; line-height:1.6; font-size:14px;">
            No AI API key has been set up yet. Click the <strong>&#9881;</strong> gear icon in the top-right corner to open Admin Settings and enter your Anthropic or OpenAI API key.
          </p>
        </div>`;
      content.classList.add('visible');
    }
    return;
  }

  const prompt = buildScoringPrompt(transcriptText);

  try {
    let result;
    if (provider === 'anthropic') result = await callAnthropic(apiKey, prompt);
    else result = await callOpenAI(apiKey, prompt);

    let jsonStr = result.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    const scorecard = JSON.parse(jsonStr);
    displayScorecard(scorecard);
    await saveScorecard(scorecard);
    logAuditEvent('info', 'App', 'Scoring completed', 'Score: ' + scorecard.overall_score + ' | Grade: ' + scorecard.overall_grade);
  } catch (err) {
    console.error('Scoring error:', err);
    logAuditEvent('error', 'Scoring', 'Scoring failed', 'Error: ' + err.message);
    const overlay = document.getElementById('scoringOverlay');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const content = document.getElementById('scorecardContent');

    if (overlay) overlay.classList.remove('visible');
    if (statusDot) statusDot.classList.remove('scoring');
    if (statusText) statusText.textContent = 'Scoring failed';
    if (content) {
      content.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--text-dim);">
          <div style="font-size:48px; margin-bottom:16px;">&#9888;&#65039;</div>
          <h3 style="margin-bottom:12px; color:var(--red);">Scoring Error</h3>
          <p style="max-width:480px; margin:0 auto; line-height:1.6; font-size:14px;">
            The AI scoring request failed. Here's the error:
          </p>
          <pre style="background:var(--surface2); padding:12px 16px; border-radius:8px; margin:16px auto; max-width:520px; text-align:left; font-size:13px; white-space:pre-wrap; word-break:break-word; color:var(--red);">${escapeHtml(err.message || String(err))}</pre>
          <p style="max-width:480px; margin:0 auto; line-height:1.6; font-size:13px; color:var(--text-dim);">
            Common causes: invalid API key, expired key, insufficient credits, or network error. Check your key in Admin Settings (&#9881;).
          </p>
        </div>`;
      content.classList.add('visible');
    }
  }
}
