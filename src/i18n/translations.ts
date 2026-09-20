export type Language = "he" | "ar";

export interface Translations {
  meta: {
    skipLink: string;
  };
  a11yWidget: {
    toggleLabel: string;
    title: string;
    textSize: string;
    increaseText: string;
    decreaseText: string;
    highContrast: string;
    underlineLinks: string;
    reset: string;
    statementLink: string;
    close: string;
  };
  header: {
    nav: {
      services: string;
      process: string;
      contact: string;
    };
    login: string;
    talkToUs: string;
    openMenu: string;
    closeMenu: string;
  };
  mobileMenu: {
    ariaLabel: string;
    navAriaLabel: string;
  };
  footer: {
    description: string;
    navTitle: string;
    contactTitle: string;
    services: string;
    process: string;
    talkToUs: string;
    accessibility: string;
    privacy: string;
    poweredBy: string;
    rights: string;
  };
  hero: {
    kicker: string;
    titleLine1: string;
    titleEm: string;
    paragraph: string;
    cta: string;
    highlights: [string, string, string];
    captionLabel: string;
    captionStrong: string;
    imageAlt: string;
  };
  products: {
    kicker: string;
    titleLine1: string;
    titleEm: string;
    paragraph: string;
    badge: string;
    items: {
      onlineCourse: string;
      inPersonCourse: string;
      hybridCourse: string;
      games: string;
      trainingVideos: string;
      simulations: string;
      presentations: string;
      eLearning: string;
    };
  };
  workflow: {
    kicker: string;
    titleLine1: string;
    titleEm: string;
    paragraph: string;
    steps: { title: string; description: string }[];
  };
  erp: {
    kicker: string;
    titleLine1: string;
    titleEm: string;
    paragraph: string;
    cta: string;
    mockupAriaLabel: string;
    projectsBoard: string;
    activeProjects: string;
  };
  contact: {
    kicker: string;
    titleLine1: string;
    titleEm: string;
    paragraph: string;
    successTitle: string;
    successText: string;
    nameLabel: string;
    orgLabel: string;
    emailLabel: string;
    phoneLabel: string;
    messageLabel: string;
    submit: string;
    nameRequired: string;
    orgRequired: string;
    emailRequired: string;
    emailInvalid: string;
  };
  login: {
    backLink: string;
    heading: string;
    subheading: string;
    emailLabel: string;
    passwordLabel: string;
    forgotPassword: string;
    submit: string;
    submitting: string;
    successMessage: string;
    authError: string;
    emailInvalid: string;
    emailRequired: string;
    showPassword: string;
    hidePassword: string;
    brandHeadingLine1: string;
    brandHeadingLine2: string;
    brandParagraph: string;
    flowSteps: string[];
  };
  accessibilityPage: {
    title: string;
    updatedLabel: string;
    intro: string;
    standardHeading: string;
    standardBody: string;
    featuresHeading: string;
    featuresBody: string;
    limitationsHeading: string;
    limitationsBody: string;
    contactHeading: string;
    contactBody: string;
    contactEmailLabel: string;
    complaintHeading: string;
    complaintBody: string;
    backLink: string;
  };
}

const he: Translations = {
  meta: {
    skipLink: "דלג לתוכן הראשי",
  },
  a11yWidget: {
    toggleLabel: "כלי נגישות",
    title: "כלי נגישות",
    textSize: "גודל טקסט",
    increaseText: "הגדלת טקסט",
    decreaseText: "הקטנת טקסט",
    highContrast: "ניגודיות גבוהה",
    underlineLinks: "הדגשת קישורים",
    reset: "איפוס הגדרות",
    statementLink: "הצהרת נגישות",
    close: "סגירת כלי נגישות",
  },
  header: {
    nav: {
      services: "שירותים",
      process: "איך זה עובד",
      contact: "צור קשר",
    },
    login: "התחברות",
    talkToUs: "דברו איתנו",
    openMenu: "פתיחת תפריט",
    closeMenu: "סגירת תפריט",
  },
  mobileMenu: {
    ariaLabel: "תפריט ראשי",
    navAriaLabel: "ניווט במובייל",
  },
  footer: {
    description:
      "מפתחים את AI Learning Operations ERP — מערכת לניהול תהליכי פיתוח למידה, מתכנון ועד השקה.",
    navTitle: "ניווט",
    contactTitle: "קשר",
    services: "שירותים",
    process: "איך זה עובד",
    talkToUs: "דברו איתנו",
    accessibility: "נגישות",
    privacy: "פרטיות",
    poweredBy: "מפעילים את AI Learning Operations ERP.",
    rights: "כל הזכויות שמורות.",
  },
  hero: {
    kicker: "פיתוח למידה מבוסס AI שעובד בעולם האמיתי",
    titleLine1: "מהרעיון ועד",
    titleEm: "מוצר למידה מוכן.",
    paragraph:
      "אנחנו מפתחים מוצרי למידה דיגיטליים ופתרונות הדרכה שמחברים בין תוכן, אנשים ובינה מלאכותית.",
    cta: "בואו נדבר",
    highlights: [
      "מומחיות בפיתוח למידה",
      "תהליך עבודה מחובר",
      "בינה מלאכותית שעובדת בשבילכם",
    ],
    captionLabel: "למידה טובה",
    captionStrong: "מתחילה באנשים.",
    imageAlt: "צוות מעצב ובונה ממשק של מוצר למידה דיגיטלי, עם סקיצות ומסך מחשב",
  },
  products: {
    kicker: "מה אנחנו מציעים",
    titleLine1: "כל דרך ללמוד",
    titleEm: "צריכה תוצר מדויק.",
    paragraph:
      "ממוצר דיגיטלי קצר ועד מסלול למידה שלם, כולם משולבים בבינה מלאכותית — אנחנו מתאימים את הפתרון למטרה, לקהל ולרגע.",
    badge: "AI",
    items: {
      onlineCourse: "קורס מקוון",
      inPersonCourse: "קורס פרונטלי",
      hybridCourse: "קורס היברידי",
      games: "משחקים",
      trainingVideos: "סרטוני הדרכה",
      simulations: "סימולציות",
      presentations: "מצגות",
      eLearning: "לומדות",
    },
  },
  workflow: {
    kicker: "איך זה עובד",
    titleLine1: "מרעיון",
    titleEm: "למוצר למידה.",
    paragraph:
      "תהליך מחובר, אנושי ומדויק, מואץ בעזרת כלי AI שמאפשר להתקדם בביטחון — גם כשהפרויקט מורכב.",
    steps: [
      {
        title: "מגדירים את הצורך",
        description: "מקשיבים לאתגר, לקהל ולתוצאה שרוצים להשיג.",
      },
      {
        title: "מתכננים את חוויית הלמידה",
        description: "מתרגמים ידע למסלול ברור, נגיש ומעורר מעורבות.",
      },
      {
        title: "מפתחים את התוצר",
        description: "כותבים, מעצבים ומפיקים את התוכן עד שהוא חי.",
      },
      {
        title: "בודקים ומשפרים",
        description: "בודקים את החוויה, מחדדים ומכינים להשקה.",
      },
      {
        title: "מאשרים ומפרסמים",
        description: "מעלים מוצר למידה שאפשר להשתמש בו ולהרחיב.",
      },
    ],
  },
  erp: {
    kicker: "וגם, כל התהליך במקום אחד",
    titleLine1: "כל התהליך.",
    titleEm: "במקום אחד.",
    paragraph:
      "מערכת תפעול מבוססת AI שמחברת בין המכירות, הפרויקטים, הפיתוח, בדיקות האיכות ואישור הלקוח.",
    cta: "כניסה למערכת",
    mockupAriaLabel: "תצוגה מקדימה של מערכת ניהול תהליך למידה",
    projectsBoard: "לוח הפרויקטים",
    activeProjects: "פרויקטים פעילים",
  },
  contact: {
    kicker: "בואו נתחיל",
    titleLine1: "כבר יש לכם",
    titleEm: "פרויקט בראש?",
    paragraph: "ספרו לנו קצת עליו ונחזור אליכם.",
    successTitle: "תודה, קיבלנו את הפנייה.",
    successText: "נחזור אליכם בהקדם.",
    nameLabel: "שם",
    orgLabel: "ארגון",
    emailLabel: "אימייל",
    phoneLabel: "טלפון",
    messageLabel: "במה נוכל לעזור?",
    submit: "שליחת פנייה",
    nameRequired: "שם הוא שדה חובה.",
    orgRequired: "ארגון הוא שדה חובה.",
    emailRequired: "כתובת אימייל היא שדה חובה.",
    emailInvalid: "נא להזין כתובת אימייל תקינה.",
  },
  login: {
    backLink: "חזרה לעמוד הראשי",
    heading: "ברוכים הבאים חזרה",
    subheading: "התחברו כדי להמשיך לסביבת העבודה שלכם.",
    emailLabel: "כתובת אימייל",
    passwordLabel: "סיסמה",
    forgotPassword: "שכחתם סיסמה?",
    submit: "התחברות",
    submitting: "מתחברים…",
    successMessage: "ההתחברות הצליחה. מסכי המערכת ייפתחו בהמשך.",
    authError: "לא ניתן להתחבר כרגע. בדקו את הפרטים ונסו שוב.",
    emailInvalid: "נא להזין כתובת אימייל תקינה.",
    emailRequired: "כתובת אימייל היא שדה חובה.",
    showPassword: "הצגת סיסמה",
    hidePassword: "הסתרת סיסמה",
    brandHeadingLine1: "כל תהליך הפיתוח.",
    brandHeadingLine2: "במקום אחד.",
    brandParagraph:
      "התחברו כדי להמשיך אל AI Learning Operations ERP — סביבת העבודה מבית IQRAA Digital Learning שמחברת בין מכירות, פרויקטים, פיתוח ואישור לקוח.",
    flowSteps: ["מכירה", "הצעה", "תשלום", "פרויקט", "פיתוח", "פרסום"],
  },
  accessibilityPage: {
    title: "הצהרת נגישות",
    updatedLabel: "עודכן לאחרונה:",
    intro:
      "IQRAA Digital Learning רואה חשיבות רבה במתן שירות שוויוני ונגיש לכלל לקוחותיה ומשתמשי האתר, לרבות אנשים עם מוגבלות. אנו פועלים להנגשת האתר בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), ולתקן הישראלי ת״י 5568 המבוסס על הנחיות WCAG 2.0 ברמה AA.",
    standardHeading: "רמת הנגישות",
    standardBody:
      "האתר תוכנן ונבנה תוך שאיפה לעמידה בדרישות תקן WCAG 2.0 ברמה AA, ובהן: ניגודיות צבעים מספקת, אפשרות ניווט מלאה במקלדת, תמיכה בטכנולוגיות מסייעות (קוראי מסך), טקסט חלופי לתמונות, ותמיכה בהעדפת 'הפחתת תנועה' של המשתמש.",
    featuresHeading: "התאמות נגישות באתר",
    featuresBody:
      "כלי הנגישות (הכפתור הצף בפינת המסך) מאפשר הגדלת והקטנת טקסט, הפעלת מצב ניגודיות גבוהה, והדגשת קישורים באמצעות קו תחתון. בנוסף, קיים קישור 'דלג לתוכן הראשי' בתחילת כל עמוד, וכל הרכיבים האינטראקטיביים נגישים באמצעות מקש Tab.",
    limitationsHeading: "מגבלות ידועות",
    limitationsBody:
      "חרף מאמצינו, ייתכן שיימצאו חלקים באתר שטרם הונגשו במלואם. אנו ממשיכים לבחון ולשפר את נגישות האתר באופן שוטף.",
    contactHeading: "פנייה בנושא נגישות",
    contactBody:
      "נתקלתם בבעיית נגישות באתר? נשמח לשמוע ולטפל בפנייתכם בהקדם האפשרי.",
    contactEmailLabel: "פנייה בדוא\"ל",
    complaintHeading: "פנייה לגורם רגולטורי",
    complaintBody:
      "במידה ולא קיבלתם מענה מספק, ניתן לפנות לנציבות שוויון זכויות לאנשים עם מוגבלות במשרד המשפטים.",
    backLink: "חזרה לעמוד הראשי",
  },
};

const ar: Translations = {
  meta: {
    skipLink: "تخطَّ إلى المحتوى الرئيسي",
  },
  a11yWidget: {
    toggleLabel: "أدوات إمكانية الوصول",
    title: "أدوات إمكانية الوصول",
    textSize: "حجم النص",
    increaseText: "تكبير النص",
    decreaseText: "تصغير النص",
    highContrast: "تباين عالٍ",
    underlineLinks: "تسطير الروابط",
    reset: "إعادة تعيين الإعدادات",
    statementLink: "بيان إمكانية الوصول",
    close: "إغلاق أدوات إمكانية الوصول",
  },
  header: {
    nav: {
      services: "الخدمات",
      process: "آلية العمل",
      contact: "تواصل معنا",
    },
    login: "تسجيل الدخول",
    talkToUs: "تحدثوا معنا",
    openMenu: "فتح القائمة",
    closeMenu: "إغلاق القائمة",
  },
  mobileMenu: {
    ariaLabel: "القائمة الرئيسية",
    navAriaLabel: "التنقل في الجوال",
  },
  footer: {
    description:
      "نطوّر نظام AI Learning Operations ERP — منصة لإدارة عمليات تطوير التعلّم، من التخطيط وحتى الإطلاق.",
    navTitle: "التنقل",
    contactTitle: "تواصل",
    services: "الخدمات",
    process: "آلية العمل",
    talkToUs: "تحدثوا معنا",
    accessibility: "إمكانية الوصول",
    privacy: "الخصوصية",
    poweredBy: "نُشغّل نظام AI Learning Operations ERP.",
    rights: "جميع الحقوق محفوظة.",
  },
  hero: {
    kicker: "تطوير تعلّم قائم على AI يعمل في العالم الحقيقي",
    titleLine1: "من الفكرة إلى",
    titleEm: "منتج تعلّم جاهز.",
    paragraph:
      "نطوّر منتجات تعلّم رقمية وحلول تدريب تجمع بين المحتوى والأشخاص والذكاء الاصطناعي.",
    cta: "لنتحدث",
    highlights: [
      "خبرة في تطوير التعلّم",
      "سير عمل متكامل",
      "ذكاء اصطناعي يعمل لصالحكم",
    ],
    captionLabel: "تعلّم جيد",
    captionStrong: "يبدأ بالأشخاص.",
    imageAlt: "فريق يصمم ويبني واجهة منتج تعلّم رقمي، مع رسومات أولية وشاشة حاسوب",
  },
  products: {
    kicker: "ماذا نقدّم",
    titleLine1: "كل طريقة للتعلّم",
    titleEm: "تحتاج إلى منتج دقيق.",
    paragraph:
      "من منتج رقمي قصير وحتى مسار تعلّم متكامل، جميعها مدمجة بالذكاء الاصطناعي — نُكيّف الحل بحسب الهدف والجمهور واللحظة المناسبة.",
    badge: "AI",
    items: {
      onlineCourse: "دورة عبر الإنترنت",
      inPersonCourse: "دورة حضورية",
      hybridCourse: "دورة هجينة",
      games: "ألعاب",
      trainingVideos: "فيديوهات تدريبية",
      simulations: "محاكاة",
      presentations: "عروض تقديمية",
      eLearning: "وحدات تعلّم إلكتروني",
    },
  },
  workflow: {
    kicker: "آلية العمل",
    titleLine1: "من الفكرة",
    titleEm: "إلى منتج تعلّم.",
    paragraph:
      "عملية متكاملة وإنسانية ودقيقة، مُسرَّعة بأدوات AI، تتيح التقدّم بثقة — حتى عندما يكون المشروع معقّدًا.",
    steps: [
      {
        title: "تحديد الاحتياج",
        description: "نستمع إلى التحدي والجمهور والنتيجة المرجوّة.",
      },
      {
        title: "تخطيط تجربة التعلّم",
        description:
          "نترجم المعرفة إلى مسار واضح وسهل الوصول ومحفّز للمشاركة.",
      },
      {
        title: "تطوير المنتج",
        description: "نكتب ونصمّم وننتج المحتوى حتى يصبح جاهزًا.",
      },
      {
        title: "الاختبار والتحسين",
        description: "نختبر التجربة، نصقلها ونجهّزها للإطلاق.",
      },
      {
        title: "الاعتماد والنشر",
        description: "نطلق منتج تعلّم قابلًا للاستخدام والتوسّع.",
      },
    ],
  },
  erp: {
    kicker: "وأيضًا، كل العملية في مكان واحد",
    titleLine1: "كل العملية.",
    titleEm: "في مكان واحد.",
    paragraph:
      "نظام تشغيل قائم على AI يربط بين المبيعات والمشاريع والتطوير وضبط الجودة وموافقة العميل.",
    cta: "الدخول إلى النظام",
    mockupAriaLabel: "معاينة لنظام إدارة عملية التعلّم",
    projectsBoard: "لوحة المشاريع",
    activeProjects: "المشاريع النشطة",
  },
  contact: {
    kicker: "لنبدأ",
    titleLine1: "هل لديكم بالفعل",
    titleEm: "مشروع في الذهن؟",
    paragraph: "أخبرونا قليلًا عنه وسنعاود التواصل معكم.",
    successTitle: "شكرًا، تم استلام طلبكم.",
    successText: "سنعاود التواصل معكم قريبًا.",
    nameLabel: "الاسم",
    orgLabel: "المؤسسة",
    emailLabel: "البريد الإلكتروني",
    phoneLabel: "الهاتف",
    messageLabel: "كيف يمكننا المساعدة؟",
    submit: "إرسال الطلب",
    nameRequired: "الاسم حقل إلزامي.",
    orgRequired: "المؤسسة حقل إلزامي.",
    emailRequired: "عنوان البريد الإلكتروني حقل إلزامي.",
    emailInvalid: "الرجاء إدخال عنوان بريد إلكتروني صالح.",
  },
  login: {
    backLink: "العودة إلى الصفحة الرئيسية",
    heading: "مرحبًا بعودتكم",
    subheading: "سجّلوا الدخول للمتابعة إلى بيئة العمل الخاصة بكم.",
    emailLabel: "عنوان البريد الإلكتروني",
    passwordLabel: "كلمة المرور",
    forgotPassword: "نسيتم كلمة المرور؟",
    submit: "تسجيل الدخول",
    submitting: "جارٍ تسجيل الدخول…",
    successMessage: "تم تسجيل الدخول بنجاح. ستُفتح شاشات النظام لاحقًا.",
    authError: "تعذّر تسجيل الدخول حاليًا. تحقّقوا من البيانات وحاولوا مرة أخرى.",
    emailInvalid: "الرجاء إدخال عنوان بريد إلكتروني صالح.",
    emailRequired: "عنوان البريد الإلكتروني حقل إلزامي.",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    brandHeadingLine1: "كل عملية التطوير.",
    brandHeadingLine2: "في مكان واحد.",
    brandParagraph:
      "سجّلوا الدخول للمتابعة إلى AI Learning Operations ERP — بيئة العمل من IQRAA Digital Learning التي تربط بين المبيعات والمشاريع والتطوير وموافقة العميل.",
    flowSteps: ["مبيعات", "عرض", "دفع", "مشروع", "تطوير", "نشر"],
  },
  accessibilityPage: {
    title: "بيان إمكانية الوصول",
    updatedLabel: "آخر تحديث:",
    intro:
      "تولي IQRAA Digital Learning أهمية كبيرة لتقديم خدمة متساوية وميسّرة لجميع عملائها ومستخدمي الموقع، بمن فيهم الأشخاص ذوو الإعاقة. نعمل على إتاحة الموقع وفقًا للمعايير الدولية لإمكانية الوصول WCAG 2.0 بمستوى AA.",
    standardHeading: "مستوى إمكانية الوصول",
    standardBody:
      "صُمم الموقع وبُني سعيًا للامتثال لمعايير WCAG 2.0 بمستوى AA، بما في ذلك: تباين ألوان كافٍ، إمكانية تصفح كاملة عبر لوحة المفاتيح، دعم لتقنيات المساعدة (قارئات الشاشة)، نص بديل للصور، ودعم لتفضيل 'تقليل الحركة'.",
    featuresHeading: "أدوات إمكانية الوصول في الموقع",
    featuresBody:
      "تتيح أداة إمكانية الوصول (الزر العائم في زاوية الشاشة) تكبير وتصغير النص، تفعيل وضع التباين العالي، وتسطير الروابط. بالإضافة إلى ذلك، يوجد رابط 'تخطَّ إلى المحتوى الرئيسي' في بداية كل صفحة، وجميع العناصر التفاعلية يمكن الوصول إليها عبر مفتاح Tab.",
    limitationsHeading: "قيود معروفة",
    limitationsBody:
      "رغم جهودنا، قد توجد أجزاء في الموقع لم تُتح بالكامل بعد. نواصل مراجعة وتحسين إمكانية الوصول في الموقع باستمرار.",
    contactHeading: "التواصل بخصوص إمكانية الوصول",
    contactBody:
      "واجهتم مشكلة في إمكانية الوصول بالموقع؟ يسعدنا سماع ملاحظاتكم ومعالجتها في أقرب وقت ممكن.",
    contactEmailLabel: "تواصل عبر البريد الإلكتروني",
    complaintHeading: "التواصل مع جهة تنظيمية",
    complaintBody:
      "إذا لم تحصلوا على استجابة مُرضية، يمكنكم التواصل مع هيئة المساواة في الحقوق للأشخاص ذوي الإعاقة.",
    backLink: "العودة إلى الصفحة الرئيسية",
  },
};

export const translations: Record<Language, Translations> = { he, ar };
