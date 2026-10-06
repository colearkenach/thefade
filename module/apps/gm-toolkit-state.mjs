// Default persisted state for the GM Toolkit (skill challenges, encounter die).

const DEFAULT_CHALLENGE = Object.freeze({
    name: "New Skill Challenge",
    goal: "",
    complexity: "simple",
    baseDT: 3,
    successes: 0,
    failures: 0,
    round: 1,
    successTarget: 4,
    failureLimit: 2,
    timeLimit: 6,
    timeUnit: "rounds",
    escalating: true,
    skills: "",
    success: "",
    failure: "",
    complications: ""
});

const DEFAULT_ENCOUNTER = Object.freeze({ escalation: 0 });

export function getDefaultSkillChallengeState() {
    return foundry.utils.deepClone(DEFAULT_CHALLENGE);
}

export function getDefaultEncounterState() {
    return foundry.utils.deepClone(DEFAULT_ENCOUNTER);
}
