(() => {
  "use strict";
  if (window.BTVAustraliaPathway139) return;
  const labels = Object.freeze(["Pathway 1", "Pathway 2", "Stream A", "Stream B — Outcomes-Based Assessment", "Qualification Assessment Required"]);
  const assessments = Object.freeze(["IQNM Self-check", "Outcomes-Based Assessment — OBA", "Multiple-choice question examination — MCQ", "NCLEX-RN", "Objective Structured Clinical Examination — OSCE", "Orientation Part 1", "Orientation Part 2"]);
  window.BTVAustraliaPathway139 = Object.freeze({
    labels,
    assessments,
    officialSelfCheckUrl: "https://www.ahpra.gov.au/Registration/International-practitioners.aspx",
    indicate(profile = {}) {
      return {
        label: "Qualification Assessment Required",
        reason: profile.qualification_country ? "Your saved professional history needs to be assessed through the official IQNM Self-check." : "Add your qualification, registration and recent practice history, then complete the official IQNM Self-check.",
        verifiedRulesConfigured: false,
      };
    },
  });
})();
