export const safetyTaskOptions = [
  "installation",
  "commissioning",
  "preventive maintenance",
  "corrective maintenance",
  "inspection",
  "site support",
  "training",
  "other",
];

export const hazardOptions = [
  "moving robots nearby",
  "forklift traffic",
  "electrical hazard",
  "loto required",
  "working at height",
  "scissor lift use",
  "restricted area",
  "battery / charging area",
  "conveyor / pinch point",
  "manual lifting hazard",
];

export const ppeOptions = [
  "safety vest",
  "steel toe shoes",
  "gloves",
  "helmet",
  "safety glasses",
  "hearing protection",
  "fall protection",
  "other PPE",
];

export const leaveTypeOptions = [
  "vacation",
  "sick",
  "personal",
  "unpaid",
  "other",
] as const;

export const siteTimezoneOptions = [
  { value: "America/New_York", label: "Eastern · America/New_York" },
  { value: "America/Chicago", label: "Central · America/Chicago" },
  { value: "America/Denver", label: "Mountain · America/Denver" },
  { value: "America/Phoenix", label: "Arizona · America/Phoenix" },
  { value: "America/Los_Angeles", label: "Pacific · America/Los_Angeles" },
  { value: "America/Anchorage", label: "Alaska · America/Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii · Pacific/Honolulu" },
  { value: "Asia/Shanghai", label: "China · Asia/Shanghai" },
  { value: "Asia/Singapore", label: "Singapore · Asia/Singapore" },
  { value: "UTC", label: "UTC" },
] as const;
