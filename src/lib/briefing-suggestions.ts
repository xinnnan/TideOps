import type { Language } from "@/lib/i18n";

const taskPhrases = {
  installation: {
    en: "review installation sequence, exclusion zones, and tool staging",
    zh: "确认安装顺序、隔离区域和工具摆放",
  },
  commissioning: {
    en: "confirm commissioning steps, energization points, and test ownership",
    zh: "确认调试步骤、上电点位和测试责任人",
  },
  "preventive maintenance": {
    en: "walk through planned maintenance scope, isolation points, and restart checks",
    zh: "过一遍预防性维护范围、隔离点和复位检查",
  },
  "corrective maintenance": {
    en: "cover fault condition, repair boundary, and restart authorization",
    zh: "说明故障状态、维修边界和复机授权",
  },
  inspection: {
    en: "align on inspection path, unsafe findings escalation, and photo evidence needs",
    zh: "统一巡检路径、异常升级方式和拍照取证要求",
  },
  "site support": {
    en: "clarify support scope, customer contacts, and stop-work triggers",
    zh: "明确现场支持范围、客户联系人和停工触发条件",
  },
  training: {
    en: "confirm training area, safe demonstration boundary, and trainee control",
    zh: "确认培训区域、安全演示边界和受训人员控制",
  },
  other: {
    en: "review today's non-standard work scope and who owns each step",
    zh: "确认今天的非标准作业范围和每一步负责人",
  },
} as const;

const hazardPhrases = {
  "moving robots nearby": {
    en: "keep clear of robot motion envelopes and maintain spotter awareness",
    zh: "注意机器人运动包络，安排观察员",
  },
  "forklift traffic": {
    en: "control pedestrian and forklift crossing points",
    zh: "控制行人和叉车交叉区域",
  },
  "electrical hazard": {
    en: "verify electrical isolation and test-before-touch",
    zh: "确认电气隔离并执行先测后触碰",
  },
  "loto required": {
    en: "verify lockout-tagout ownership before work starts",
    zh: "开工前确认上锁挂牌负责人",
  },
  "working at height": {
    en: "review fall protection and access equipment checks",
    zh: "复核防坠落措施和登高设备检查",
  },
  "scissor lift use": {
    en: "confirm lift inspection, travel path, and overhead clearance",
    zh: "确认剪叉车点检、行驶路线和上方净空",
  },
  "restricted area": {
    en: "confirm permit boundary and escort requirements",
    zh: "确认受限区域许可边界和陪同要求",
  },
  "battery / charging area": {
    en: "avoid charging hazards, arc risks, and acid exposure",
    zh: "注意充电区域的电弧、酸液和充电风险",
  },
  "conveyor / pinch point": {
    en: "keep hands clear of pinch points and verify local isolation",
    zh: "避开夹点并确认局部隔离",
  },
  "manual lifting hazard": {
    en: "review team lift expectations and material handling path",
    zh: "确认协同搬运方式和搬运路线",
  },
} as const;

export function generateBriefingSuggestion(
  taskTypes: string[],
  hazards: string[],
  language: Language,
) {
  const taskNotes = taskTypes
    .slice(0, 2)
    .map((task) => taskPhrases[task as keyof typeof taskPhrases]?.[language])
    .filter(Boolean);
  const hazardNotes = hazards
    .slice(0, 3)
    .map((hazard) => hazardPhrases[hazard as keyof typeof hazardPhrases]?.[language])
    .filter(Boolean);

  if (taskNotes.length === 0 && hazardNotes.length === 0) {
    return "";
  }

  if (language === "zh") {
    const sections = [
      taskNotes.length > 0 ? `今天先${taskNotes.join("；")}` : "",
      hazardNotes.length > 0 ? `风险重点：${hazardNotes.join("；")}` : "",
      "确认停工条件、沟通路径和 PPE 后再开工。",
    ].filter(Boolean);

    return sections.join(" ");
  }

  const sections = [
    taskNotes.length > 0 ? `Before starting, ${taskNotes.join("; ")}.` : "",
    hazardNotes.length > 0 ? `Key hazard reminders: ${hazardNotes.join("; ")}.` : "",
    "Confirm stop-work triggers, communication path, and PPE before work begins.",
  ].filter(Boolean);

  return sections.join(" ");
}
