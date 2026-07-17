(() => {
  'use strict';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
  const words = (value) => String(value || '').trim().split(/\s+/).filter(Boolean);

  function markWriting(item, response) {
    const text = String(response || '').trim();
    const count = words(text).length;
    const task = Number(item?.task || (/task 1/i.test(item?.type || '') ? 1 : 2));
    const minimum = Number(item?.minimumWords || (task === 1 ? 150 : 250));
    const paragraphs = text.split(/\n\s*\n/).filter((part) => words(part).length > 4).length;
    const hasOverview = /(overall|in general|it is clear)/i.test(text);
    const hasPosition = /(i agree|i disagree|in my view|this essay)/i.test(text);
    const development = count >= minimum ? 6 : count >= minimum * 0.8 ? 5 : 4;
    const taskBand = Math.min(8, development + (task === 1 ? hasOverview : hasPosition ? 1 : 0));
    const cohesion = Math.min(8, paragraphs >= 4 ? 7 : paragraphs >= 2 ? 5.5 : 4);
    const overall = Math.round(((taskBand + cohesion + 5.5 + 5.5) / 4) * 2) / 2;
    return `<h4>Formative estimated band: ${overall.toFixed(1)}</h4><p>This practice estimate is not an official IELTS result.</p><ul><li><b>Task ${task === 1 ? 'Achievement' : 'Response'}:</b> ${taskBand.toFixed(1)}</li><li><b>Coherence and Cohesion:</b> ${cohesion.toFixed(1)}</li><li><b>Lexical Resource:</b> 5.5</li><li><b>Grammatical Range and Accuracy:</b> 5.5</li></ul><p><b>Evidence reviewed:</b> ${count} words and ${paragraphs} developed paragraph(s).</p><ol><li>${count < minimum ? `Develop the response to at least ${minimum} words without repetition.` : 'Strengthen each main idea with precise evidence or comparison.'}</li><li>${task === 1 && !hasOverview ? 'Add a clear overview of the most important features.' : task === 2 && !hasPosition ? 'State and maintain a clear position.' : 'Make the progression between ideas more explicit.'}</li><li>Proofread articles, agreement, punctuation, and sentence boundaries.</li></ol>`;
  }

  function markReading(item, response) {
    const expected = String(item?.answer || '').trim();
    const correct = expected && String(response || '').trim().toLowerCase() === expected.toLowerCase();
    return `<h4>${correct ? 'Correct' : 'Review this response'}</h4><p>${correct ? 'Your response matches the answer supported by the passage.' : `A stronger response is <b>${escapeHtml(expected || 'not available')}</b>.`}</p><p>${escapeHtml(item?.explanation || 'Return to the passage, locate explicit evidence, and check that the wording fits the question type.')}</p>`;
  }

  function answer(question) {
    const value = String(question || '').toLowerCase();
    if (/budget|cost|fee/.test(value)) return 'Open Costs to review your saved plan. Verify current official fees before making a payment.';
    if (/next|journey|visa/.test(value)) return 'Open Journey and continue with the earliest unfinished requirement. Check its official-source link before submitting documents or paying a fee.';
    if (/cbt|nclex|osce|calculation|nursing/.test(value)) return 'I can help you reason through the relevant practice question using safety, prioritisation, and the explanation provided with that question. For patient-specific decisions, follow current local policy and consult an appropriately qualified clinician.';
    if (/ielts|writing|reading/.test(value)) return 'Open IELTS practice and choose a task. I can review your response against the IELTS Academic criteria and give formative, evidence-based improvements.';
    return 'I can still help with app navigation, journey planning, IELTS practice, and the explanations included with your learning questions. Verify clinical, immigration, and legal decisions with current official guidance.';
  }

  window.BTVZiburFallback = {
    answer,
    markIELTS: (section, item, response) => section === 'writing'
      ? markWriting(item, response)
      : markReading(item, response),
  };
})();
