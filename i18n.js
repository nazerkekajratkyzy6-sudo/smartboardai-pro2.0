// i18n.js — 3 тілдік интерфейс (KZ / RU / EN)

const translations = {
  kk: {
    // LOGIN
    login_title: "Кіру",
    login_subtitle_teacher: "Мұғалім кабинеті — кіру",
    login_email: "Email",
    login_password: "Құпиясөз",
    login_button: "Кіру",
    login_no_account: "Аккаунтыңыз жоқ па?",
    login_register_link: "Тіркелу",

    // STUDENT
    student_title: "🎓 Оқушы панелі",
    student_subtitle: "Мұғалім берген Room ID арқылы қосылыңыз.",
    student_join_title: "Бөлмеге қосылу",
    student_name_placeholder: "Атыңыз",
    student_room_placeholder: "Room ID",
    student_join_button: "Қосылу",
    student_join_status_default: "",
    student_answer_title: "📘 Тапсырмаға жауап беру",
    student_answer_placeholder: "Жауабыңызды жазыңыз...",
    student_answer_send: "Жауап жіберу",
    student_word_title: "💬 Рефлексия (1 сөз)",
    student_word_placeholder: "Бір сөз жазыңыз...",
    student_word_send: "Қосу",
    student_emoji_title: "🙂 Эмоциялық рефлексия",
    student_emoji_hint: "Сіздің эмоцияңыз мұғалімге көрінеді.",

    // TEACHER
    teacher_header_title: "SmartBoardAI PRO — Мұғалім тақтасы",
    teacher_create_room: "Жаңа Room",
    tools_title: "Құралдар",
    tool_card: "Карточка",
    tool_photo: "Фото",
    tool_video: "Видео",
    tool_link: "Сілтеме",
    tool_formula: "Формула",
    tool_trainer: "Тренажер",
    tool_quiz: "Викторина",

    ai_panel_title: "AI тапсырма генераторы",
    ai_panel_placeholder: "AI-ға тапсырма жазыңыз...",
    ai_panel_generate: "AI → Блок қосу",
    ai_panel_lesson_planner: "📘 Lesson Planner",

    tab_answers: "Жауаптар",
    tab_students: "Оқушылар",
    tab_emoji: "Эмоция",
    tab_cloud: "Word Cloud",

    answers_title: "Оқушы жауаптары",
    answers_empty: "Әзірше жауап жоқ...",
    students_title: "Оқушылар",
    students_empty: "Ешкім қосылмады",
    emoji_title_teacher: "Эмоциялық рефлексия",
    emoji_stats_empty: "Әзірше эмоция жоқ...",
    cloud_title: "Word Cloud (сөз бұлты)",
    cloud_empty: "Пікір жоқ...",

    lp_modal_title: "📘 Lesson Planner",
    lp_subject_label: "Пән:",
    lp_subject_placeholder: "Математика, Қазақ тілі, Физика",
    lp_grade_label: "Сынып:",
    lp_grade_placeholder: "7-сынып",
    lp_topic_label: "Тақырып:",
    lp_topic_placeholder: "Мысалы: Бөлшектерді қосу",
    lp_lang_label: "Тіл:",
    lp_format_label: "Формат:",
    lp_extra_label: "Қосымша талап:",
    lp_extra_placeholder: "Дифференциация, ойын, ИИ қолдану...",
    lp_generate_button: "🤖 Сабақ жоспарын құру",
    lp_insert_button: "➕ Тақтаға қосу",
    lp_result_title: "Генерацияланған жоспар:",
  },

  ru: {
    // LOGIN
    login_title: "Вход",
    login_subtitle_teacher: "Кабинет учителя — вход",
    login_email: "Email",
    login_password: "Пароль",
    login_button: "Войти",
    login_no_account: "Нет аккаунта?",
    login_register_link: "Зарегистрироваться",

    // STUDENT
    student_title: "🎓 Панель ученика",
    student_subtitle: "Подключитесь по Room ID, который дал учитель.",
    student_join_title: "Подключиться к комнате",
    student_name_placeholder: "Ваше имя",
    student_room_placeholder: "Room ID",
    student_join_button: "Подключиться",
    student_join_status_default: "",
    student_answer_title: "📘 Ответ на задание",
    student_answer_placeholder: "Напишите ваш ответ...",
    student_answer_send: "Отправить ответ",
    student_word_title: "💬 Рефлексия (1 слово)",
    student_word_placeholder: "Напишите одно слово...",
    student_word_send: "Отправить",
    student_emoji_title: "🙂 Эмоциональная рефлексия",
    student_emoji_hint: "Ваше настроение видно учителю.",

    // TEACHER
    teacher_header_title: "SmartBoardAI PRO — Панель учителя",
    teacher_create_room: "Новая комната",
    tools_title: "Инструменты",
    tool_card: "Карточка",
    tool_photo: "Фото",
    tool_video: "Видео",
    tool_link: "Ссылка",
    tool_formula: "Формула",
    tool_trainer: "Тренажёр",
    tool_quiz: "Викторина",

    ai_panel_title: "AI генератор заданий",
    ai_panel_placeholder: "Напишите запрос для AI...",
    ai_panel_generate: "AI → Добавить блок",
    ai_panel_lesson_planner: "📘 План урока",

    tab_answers: "Ответы",
    tab_students: "Ученики",
    tab_emoji: "Эмоции",
    tab_cloud: "Word Cloud",

    answers_title: "Ответы учеников",
    answers_empty: "Ответов пока нет...",
    students_title: "Ученики",
    students_empty: "Никто не подключился",
    emoji_title_teacher: "Эмоциональная рефлексия",
    emoji_stats_empty: "Эмоций пока нет...",
    cloud_title: "Word Cloud (облако слов)",
    cloud_empty: "Пока нет слов...",

    lp_modal_title: "📘 Планировщик урока",
    lp_subject_label: "Предмет:",
    lp_subject_placeholder: "Математика, Русский язык, Физика",
    lp_grade_label: "Класс:",
    lp_grade_placeholder: "7 класс",
    lp_topic_label: "Тема:",
    lp_topic_placeholder: "Например: Сложение дробей",
    lp_lang_label: "Язык:",
    lp_format_label: "Формат:",
    lp_extra_label: "Доп. требования:",
    lp_extra_placeholder: "Дифференциация, игра, использование ИИ...",
    lp_generate_button: "🤖 Сгенерировать план урока",
    lp_insert_button: "➕ Добавить на доску",
    lp_result_title: "Сгенерированный план:",
  },

  en: {
    // LOGIN
    login_title: "Login",
    login_subtitle_teacher: "Teacher dashboard — login",
    login_email: "Email",
    login_password: "Password",
    login_button: "Sign in",
    login_no_account: "No account?",
    login_register_link: "Register",

    // STUDENT
    student_title: "🎓 Student Panel",
    student_subtitle: "Join with the Room ID given by your teacher.",
    student_join_title: "Join Room",
    student_name_placeholder: "Your name",
    student_room_placeholder: "Room ID",
    student_join_button: "Join",
    student_join_status_default: "",
    student_answer_title: "📘 Answer the task",
    student_answer_placeholder: "Type your answer...",
    student_answer_send: "Send answer",
    student_word_title: "💬 Reflection (1 word)",
    student_word_placeholder: "Type one word...",
    student_word_send: "Send",
    student_emoji_title: "🙂 Emotional reflection",
    student_emoji_hint: "Your emotion is visible to the teacher.",

    // TEACHER
    teacher_header_title: "SmartBoardAI PRO — Teacher Board",
    teacher_create_room: "New Room",
    tools_title: "Tools",
    tool_card: "Card",
    tool_photo: "Photo",
    tool_video: "Video",
    tool_link: "Link",
    tool_formula: "Formula",
    tool_trainer: "Trainer",
    tool_quiz: "Quiz",

    ai_panel_title: "AI Task Generator",
    ai_panel_placeholder: "Write a prompt for the AI...",
    ai_panel_generate: "AI → Add block",
    ai_panel_lesson_planner: "📘 Lesson Planner",

    tab_answers: "Answers",
    tab_students: "Students",
    tab_emoji: "Emotions",
    tab_cloud: "Word Cloud",

    answers_title: "Student answers",
    answers_empty: "No answers yet...",
    students_title: "Students",
    students_empty: "No one joined",
    emoji_title_teacher: "Emotional reflection",
    emoji_stats_empty: "No emotions yet...",
    cloud_title: "Word Cloud",
    cloud_empty: "No words yet...",

    lp_modal_title: "📘 Lesson Planner",
    lp_subject_label: "Subject:",
    lp_subject_placeholder: "Math, English, Physics",
    lp_grade_label: "Grade:",
    lp_grade_placeholder: "Grade 7",
    lp_topic_label: "Topic:",
    lp_topic_placeholder: "e.g. Adding fractions",
    lp_lang_label: "Language:",
    lp_format_label: "Format:",
    lp_extra_label: "Extra requirements:",
    lp_extra_placeholder: "Differentiation, game, AI usage...",
    lp_generate_button: "🤖 Generate lesson plan",
    lp_insert_button: "➕ Add to board",
    lp_result_title: "Generated plan:",
  },
};

function setLang(lang) {
  const dict = translations[lang] || translations.kk;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const val = dict[key];
    if (!val) return;

    if (
      el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA"
    ) {
      el.placeholder = val;
    } else {
      el.textContent = val;
    }
  });

  document.querySelectorAll("[data-lang-current]").forEach((el) => {
    el.textContent =
      lang === "kk" ? "KZ" : lang === "ru" ? "RU" : "EN";
  });

  localStorage.setItem("sbai_lang", lang);
}

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("sbai_lang") || "kk";
  setLang(saved);

  document.querySelectorAll("[data-lang-option]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang-option");
      setLang(lang);
      const dd = btn.closest(".lang-dropdown");
      if (dd) dd.style.display = "none";
    });
  });
});
