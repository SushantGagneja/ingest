export const ELIGIBILITY_STATES = [
  "Andhra Pradesh", "Assam", "Chhattisgarh", "Gujarat", "Jharkhand", "Madhya Pradesh", "Maharashtra", "Manipur", "Odisha", "Rajasthan", "Telangana", "West Bengal",
]

export const CHECKER_DOCUMENTS = [
  "Scheduled Tribe certificate",
  "Date of birth proof",
  "Latest qualifying examination marksheet",
  "Income certificate, if required by the published scheme rules",
]

export type CheckerFacts = {
  state: string
  community: string
  dob: string
  qualification: string
  courseLevel: string
  income: string
}

export type CheckerOutcome = { kind: "eligible" | "review" | "incomplete"; title: string; reason: string }

export function checkEligibility(facts: CheckerFacts): CheckerOutcome {
  if (Object.values(facts).some((value) => !value.trim())) {
    return { kind: "incomplete", title: "Add the remaining details", reason: "The checker needs all six facts before it can give a preliminary result." }
  }

  const dob = new Date(facts.dob)
  if (Number.isNaN(dob.getTime()) || dob > new Date()) {
    return { kind: "review", title: "Check the date of birth", reason: "Enter a valid date of birth before continuing." }
  }

  return {
    kind: "eligible",
    title: "You appear eligible to explore NFST and NOS",
    reason: "This is a preliminary result based on the details you entered. Final eligibility is determined against the published cycle rules and your documents.",
  }
}
