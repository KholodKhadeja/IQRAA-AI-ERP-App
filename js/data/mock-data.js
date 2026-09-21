/* Shared mock/demo dataset for the internal Workspace (Admin Overview,
   Projects List, Project Workspace, Leads, Clients, PM Workspace). Plain
   data, same style as js/i18n/translations.js (no IIFE needed, nothing but
   data). Airtable becomes the real system of record later (CLAUDE.md §19)
   — until then, every Workspace screen that shows this kind of data reads
   from here so the same record looks the same everywhere it appears,
   instead of each page inventing its own disconnected sample rows.
   Renamed from js/data/projects.js (2026-09-21d) once it grew past just
   projects — see CLAUDE.md §3. */
window.IQRAA = window.IQRAA || {};
IQRAA.data = IQRAA.data || {};

IQRAA.data.pipelineStages = [
  { key: "specification", labelKey: "pipeline.specification" },
  { key: "script", labelKey: "pipeline.script" },
  { key: "clientScriptApproval", labelKey: "pipeline.clientScriptApproval" },
  { key: "design", labelKey: "pipeline.design" },
  { key: "production", labelKey: "pipeline.production" },
  { key: "qa1", labelKey: "pipeline.qa" },
  { key: "clientReview", labelKey: "pipeline.clientReview" },
  { key: "changes", labelKey: "pipeline.changes" },
  { key: "qa2", labelKey: "pipeline.qa" },
  { key: "clientApproval", labelKey: "pipeline.clientApproval" },
  { key: "publication", labelKey: "pipeline.publication" }
];

IQRAA.data.teamMembers = [
  { id: "tm-1", name: "רונית שגיא", roleKey: "teamRole.producer", status: "active" },
  { id: "tm-2", name: "עאמר יונס", roleKey: "teamRole.designer", status: "active" },
  { id: "tm-3", name: "מאיה אשכנזי", roleKey: "teamRole.instructionalDesigner", status: "active" },
  { id: "tm-4", name: "חוסאם עלי", roleKey: "teamRole.qa", status: "active" },
  { id: "tm-5", name: "דן קפלן", roleKey: "teamRole.developer", status: "paused" }
];

IQRAA.data.projectManagers = [
  { id: "pm-1", name: "נועה פרץ", email: "noa@iqraa-digital.co.il" },
  { id: "pm-2", name: "יוסף חדאד", email: "yosef@iqraa-digital.co.il" },
  { id: "pm-3", name: "ליאור בן-דוד", email: "lior@iqraa-digital.co.il" }
];

/* The demo-logged-in PM/Team Member/Client whenever window.IQRAA_ROLE is
   "pm"/"teamMember"/"client" — there's no real per-user login yet
   (CLAUDE.md §5), so role-scoped screens need a fixed identity to filter
   against, the same way the Admin pages already use a fixed demo role. */
IQRAA.data.currentPmId = "pm-1";
IQRAA.data.currentTeamMemberId = "tm-1";
IQRAA.data.currentClientId = "cl-2";

IQRAA.data.clients = [
  { id: "cl-1", name: "רשת בתי ספר אביב", contactName: "אורית לוי", contactEmail: "orit@aviv-schools.co.il", contactPhone: "03-5551234" },
  { id: "cl-2", name: "אקדמיית אל-נור", contactName: "בילאל מנסור", contactEmail: "bilal@al-noor-academy.org", contactPhone: "04-6667788" },
  { id: "cl-3", name: "מכללת טכנו-בריג'", contactName: "שירה כהן", contactEmail: "shira@technobridge.ac.il", contactPhone: "09-7712345" },
  { id: "cl-4", name: "מרכז רואדה לילדים", contactName: "היפא דרוויש", contactEmail: "hifa@rawda-center.org", contactPhone: "04-9098765" },
  { id: "cl-5", name: 'מרכז דיגיטל בע"מ', contactName: "עידו ברק", contactEmail: "ido@digitalcenter.co.il", contactPhone: "03-4445566" },
  { id: "cl-6", name: "בית ספר אלאמל", contactName: "מוחמד סאלח", contactEmail: "salah@alamal-school.edu", contactPhone: "04-8887766" },
  { id: "cl-7", name: "קריית חינוך כפר-סבא", contactName: "טל אביטן", contactEmail: "tal@ks-education.org.il", contactPhone: "09-3334455" }
];

IQRAA.data.projects = [
  {
    id: "proj-1",
    name: "פלטפורמת קורסי בטיחות",
    clientId: "cl-1",
    summary: "פלטפורמת e-learning להדרכות בטיחות חובה לצוותי הוראה, כולל מעקב התקדמות ומבחני סיום.",
    pmId: "pm-1",
    stageKey: "production",
    status: "onTrack",
    progress: 62,
    deadline: "2026-10-09",
    paymentState: "paid",
    totalValue: 120000,
    received: 120000,
    invoiceDueDate: null,
    teamIds: ["tm-1", "tm-3", "tm-5"]
  },
  {
    id: "proj-2",
    name: "מסלול הכשרת מורים דיגיטלי",
    clientId: "cl-2",
    summary: "מסלול הכשרה מקוון להטמעת כלים דיגיטליים בהוראה, בליווי סדנאות ומטלות מעשיות.",
    pmId: "pm-2",
    stageKey: "clientReview",
    status: "attention",
    progress: 78,
    deadline: "2026-09-26",
    paymentState: "paid",
    totalValue: 95000,
    received: 95000,
    invoiceDueDate: null,
    teamIds: ["tm-2", "tm-4"]
  },
  {
    id: "proj-3",
    name: "לומדת מיומנויות דיגיטליות",
    clientId: "cl-3",
    summary: "לומדת אינטראקטיבית ללימוד מיומנויות דיגיטל בסיסיות לסטודנטים חדשים במכללה.",
    pmId: "pm-3",
    stageKey: "design",
    status: "onTrack",
    progress: 30,
    deadline: "2026-10-31",
    paymentState: "partial",
    totalValue: 150000,
    received: 60000,
    invoiceDueDate: "2026-09-15",
    teamIds: ["tm-2", "tm-3"]
  },
  {
    id: "proj-4",
    name: "סימולציית מעבדת מדעים",
    clientId: "cl-4",
    summary: "סימולציה תלת-ממדית של ניסויי מדעים לילדים, מיועדת לשימוש בכיתה וללמידה עצמאית.",
    pmId: "pm-1",
    stageKey: "qa1",
    status: "overdue",
    progress: 55,
    deadline: "2026-09-18",
    paymentState: "paid",
    totalValue: 80000,
    received: 80000,
    invoiceDueDate: null,
    teamIds: ["tm-4", "tm-5"]
  },
  {
    id: "proj-7",
    name: "סדרת סרטוני הדרכה ארגונית",
    clientId: "cl-5",
    summary: "סדרת סרטוני הדרכה קצרים לעובדים חדשים, כולל חוברת מנחה ושאלון משוב.",
    pmId: "pm-3",
    stageKey: "publication",
    status: "onTrack",
    progress: 96,
    deadline: "2026-09-24",
    paymentState: "paid",
    totalValue: 45000,
    received: 45000,
    invoiceDueDate: null,
    teamIds: ["tm-1", "tm-2"]
  },
  {
    id: "proj-5",
    name: "תוכנית לימודים היברידית",
    clientId: "cl-6",
    summary: "תוכנית לימודים המשלבת מפגשי כיתה ולמידה מקוונת, בשלבי אפיון ראשוניים.",
    pmId: null,
    stageKey: null,
    status: "readyToStart",
    progress: 0,
    deadline: null,
    paymentState: "firstPaymentReceived",
    totalValue: 70000,
    received: 21000,
    invoiceDueDate: null,
    teamIds: []
  },
  {
    id: "proj-6",
    name: "פורטל למידה עצמאית",
    clientId: "cl-7",
    summary: "פורטל ללמידה עצמאית של תלמידים בשעות הפנאי, עם מעקב הורים והתראות התקדמות.",
    pmId: null,
    stageKey: null,
    status: "readyToStart",
    progress: 0,
    deadline: null,
    paymentState: "firstPaymentReceived",
    totalValue: 55000,
    received: 16500,
    invoiceDueDate: null,
    teamIds: []
  }
];

IQRAA.data.resourceTemplates = [
  { icon: "folder", titleKey: "resourceType.script" },
  { icon: "folder", titleKey: "resourceType.designFiles" },
  { icon: "folder", titleKey: "resourceType.productionFolder" }
];

IQRAA.data.tasks = [
  { id: "t-1", projectId: "proj-1", title: "כתיבת תסריט לפרק 3", assigneeId: "tm-1", status: "completed", priority: "medium", dueDate: "2026-09-10" },
  { id: "t-2", projectId: "proj-1", title: "עיצוב דמויות אנימציה", assigneeId: "tm-3", status: "inProgress", priority: "high", dueDate: "2026-09-25" },
  { id: "t-3", projectId: "proj-1", title: "הקלטת קריינות", assigneeId: "tm-5", status: "notStarted", priority: "medium", dueDate: "2026-10-02" },
  { id: "t-4", projectId: "proj-2", title: "עדכון מצגת הדרכה לפי הערות לקוח", assigneeId: "tm-2", status: "review", priority: "high", dueDate: "2026-09-23" },
  { id: "t-5", projectId: "proj-2", title: "בדיקת נגישות למודול 2", assigneeId: "tm-4", status: "waiting", priority: "medium", dueDate: "2026-09-27" },
  { id: "t-6", projectId: "proj-3", title: "מיפוי מסכי UX", assigneeId: "tm-2", status: "inProgress", priority: "medium", dueDate: "2026-10-05" },
  { id: "t-7", projectId: "proj-3", title: "כתיבת תוכן לימודי — יחידה 1", assigneeId: "tm-3", status: "notStarted", priority: "low", dueDate: "2026-10-15" },
  { id: "t-8", projectId: "proj-4", title: "בדיקות QA לסימולציה", assigneeId: "tm-4", status: "inProgress", priority: "high", dueDate: "2026-09-16" },
  { id: "t-9", projectId: "proj-4", title: "תיקון באגים בממשק", assigneeId: "tm-5", status: "waiting", priority: "high", dueDate: "2026-09-17" },
  { id: "t-10", projectId: "proj-7", title: "העלאת סרטונים לפלטפורמה", assigneeId: "tm-1", status: "inProgress", priority: "medium", dueDate: "2026-09-22" },
  { id: "t-11", projectId: "proj-7", title: "כתיבת חוברת מנחה סופית", assigneeId: "tm-2", status: "completed", priority: "low", dueDate: "2026-09-15" },
  { id: "t-12", projectId: "proj-1", title: "עריכת גרסת טיוטה לפרק 2", assigneeId: "tm-1", status: "inProgress", priority: "high", dueDate: "2026-09-21" },
  { id: "t-13", projectId: "proj-1", title: "תיאום מול מעצב הגרפיקה", assigneeId: "tm-1", status: "waiting", priority: "medium", dueDate: "2026-09-19" }
];

IQRAA.data.meetings = [
  {
    id: "m-1",
    projectId: "proj-1",
    typeKey: "meetingType.kickoff",
    date: "2026-08-05",
    participants: ["נועה פרץ", "רונית שגיא", "אורית לוי (לקוח)"],
    summary: "פגישת פתיחה להצגת מטרות הפרויקט ולוחות זמנים.",
    decisions: ["אישור מסגרת תוכן ראשונית", "קביעת תדירות עדכונים שבועית"],
    followUpTasks: ["שליחת מסמך אפיון מעודכן ללקוח"]
  },
  {
    id: "m-2",
    projectId: "proj-1",
    typeKey: "meetingType.statusUpdate",
    date: "2026-09-14",
    participants: ["נועה פרץ", "מאיה אשכנזי"],
    summary: "סקירת התקדמות שלב ההפקה.",
    decisions: ["דחיית מועד הקלטת הקריינות בשבוע"],
    followUpTasks: ["תיאום סטודיו הקלטה חדש"]
  },
  {
    id: "m-3",
    projectId: "proj-2",
    typeKey: "meetingType.clientReview",
    date: "2026-09-17",
    participants: ["יוסף חדאד", "בילאל מנסור (לקוח)"],
    summary: "סקירת גרסת בטא של מסלול ההכשרה מול הלקוח.",
    decisions: ["נדרשים שינויים במצגת הפתיחה", "אישור עקרוני לשאר התוכן"],
    followUpTasks: ["עדכון מצגת לפי הערות", "תיאום פגישת אישור סופית"]
  },
  {
    id: "m-4",
    projectId: "proj-3",
    typeKey: "meetingType.internalSync",
    date: "2026-09-10",
    participants: ["ליאור בן-דוד", "עאמר יונס", "מאיה אשכנזי"],
    summary: "סנכרון פנימי על עיצוב חוויית המשתמש.",
    decisions: ["אימוץ סגנון עיצוב מינימליסטי"],
    followUpTasks: []
  },
  {
    id: "m-5",
    projectId: "proj-7",
    typeKey: "meetingType.clientReview",
    date: "2026-09-18",
    participants: ["ליאור בן-דוד", "עידו ברק (לקוח)"],
    summary: "אישור סופי של תוכן הסרטונים לפני פרסום.",
    decisions: ["אושר לפרסום", "תיאום מועד השקה רשמי"],
    followUpTasks: ["תיאום מועד השקה עם הלקוח"]
  }
];

IQRAA.data.recentActivity = [
  { icon: "creditCard", textKey: "activity.paymentReceived", projectId: "proj-6", when: "2026-09-20T09:10:00" },
  { icon: "layoutDashboard", textKey: "activity.stageChanged", projectId: "proj-2", when: "2026-09-19T14:32:00" },
  { icon: "check", textKey: "activity.deliverableApproved", projectId: "proj-7", when: "2026-09-19T11:05:00" },
  { icon: "users", textKey: "activity.teamAssigned", projectId: "proj-3", when: "2026-09-18T16:40:00" },
  { icon: "trendingUp", textKey: "activity.newLead", projectId: null, when: "2026-09-18T10:02:00" },
  { icon: "alertTriangle", textKey: "activity.taskOverdue", projectId: "proj-4", when: "2026-09-17T08:15:00" }
];

IQRAA.data.leads = [
  { id: "lead-1", name: "יעל שרון", org: "גן ילדים הדקל", email: "yael@hadekel-kg.co.il", phone: "052-1112222", serviceKey: "products.items.onlineCourse", statusKey: "new", assignedTo: "נועה פרץ", sourceKey: "leadSource.website", createdDate: "2026-09-19", lastActivityDate: "2026-09-19" },
  { id: "lead-2", name: "עומר פארוק", org: "מרכז הכשרה מקצועית נור", email: "omar@noor-training.org", phone: "050-2223333", serviceKey: "products.items.hybridCourse", statusKey: "qualified", assignedTo: "יוסף חדאד", sourceKey: "leadSource.referral", createdDate: "2026-09-15", lastActivityDate: "2026-09-20" },
  { id: "lead-3", name: "דנה אביטל", org: "רשת מכללות עתיד", email: "dana@atid-colleges.ac.il", phone: "054-3334444", serviceKey: "products.items.simulations", statusKey: "proposalSent", assignedTo: "ליאור בן-דוד", sourceKey: "leadSource.website", createdDate: "2026-09-10", lastActivityDate: "2026-09-18" },
  { id: "lead-4", name: "מוראד חליל", org: "בית ספר אלנג'אח", email: "murad@alnajah-school.edu", phone: "04-4445555", serviceKey: "products.items.games", statusKey: "won", assignedTo: "נועה פרץ", sourceKey: "leadSource.referral", createdDate: "2026-08-20", lastActivityDate: "2026-09-05" },
  { id: "lead-5", name: "שירן כהן", org: "חברת הייטק לומדים", email: "shiran@lomdim-tech.co.il", phone: "053-5556666", serviceKey: "products.items.eLearning", statusKey: "lost", assignedTo: "יוסף חדאד", sourceKey: "leadSource.social", createdDate: "2026-08-15", lastActivityDate: "2026-08-30" },
  { id: "lead-6", name: "איברהים עות'מאן", org: "עמותת חינוך לעתיד", email: "ibrahim@futureedu-ngo.org", phone: "050-6667777", serviceKey: "products.items.trainingVideos", statusKey: "new", assignedTo: "ליאור בן-דוד", sourceKey: "leadSource.website", createdDate: "2026-09-20", lastActivityDate: "2026-09-20" },
  { id: "lead-7", name: "נועם פלד", org: "בית ספר רננים", email: "noam@renanim-school.co.il", phone: "052-7778888", serviceKey: "products.items.presentations", statusKey: "qualified", assignedTo: "נועה פרץ", sourceKey: "leadSource.referral", createdDate: "2026-09-12", lastActivityDate: "2026-09-19" },
  { id: "lead-8", name: "רים סאבא", org: "מרכז קהילתי אלסלאם", email: "reem@alsalam-community.org", phone: "04-8889999", serviceKey: "products.items.inPersonCourse", statusKey: "proposalSent", assignedTo: "יוסף חדאד", sourceKey: "leadSource.website", createdDate: "2026-09-08", lastActivityDate: "2026-09-17" }
];

/* Client-submitted feedback (Client Portal, screens.md §23) — starts empty
   on purpose, so the "no feedback yet" empty state is real and reachable,
   not just theoretical. Entries are added in-memory as the demo client
   submits feedback; nothing is pre-seeded here. */
IQRAA.data.clientFeedback = [];

/* outstandingPayments is intentionally NOT a static number here — Admin
   Overview and Billing Overview both compute it from projects'
   totalValue/received (see js/services/project-helpers.js's
   billingTotals()) so the two screens can never show two different
   figures for the same thing. */
IQRAA.data.kpis = {
  newLeads: 14,
  pendingApprovals: 3,
  overdueTasks: 7
};
