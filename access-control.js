// =====================================================
// access-control.js — SmartBoardAI PRO
// Қолжетімділікті басқаратын БІРЫҲАЙ орын.
// login.html, teacher.js — екеуі де осы файлдан оқиды.
// =====================================================

import { db, ref, get, set, runTransaction } from "./firebaseConfig.js";

// ── РЕЖИМ ────────────────────────────────────────────
// "open"   — кез келген адам тіркеліп, шектеусіз қолдана алады
// "slots"  — алғашқы MAX_SLOTS адам ғана кіре алады, әрқайсысы БІР РЕТ
//            (email тізімі қажет емес — кезек бойынша, "бірінші келген — кірген")
// "closed" — ешкім кіре алмайды (UNLIMITED_EMAILS-тен басқа)
//
// Конкурс кезінде:        "slots"  (мыс. 2 адамға)
// Конкурстан кейін жабу:  "closed"
// Кейін бәріне ашу:       "open"
export const ACCESS_MODE = "slots";

// "slots" режiминде неше адамға рұқсат — қазір 2
export const MAX_SLOTS = 2;

// Бұл адамдарға ЕШҚАНДАЙ шектеу жоқ — әрқашан, кез келген режимде кіре алады
export const UNLIMITED_EMAILS = [
  "naz-erke_k@mail.ru",
];

/**
 * Берілген пайдаланушы осы платформаға қазір кіре алады ма — бірыңғай тексеру.
 * Firebase-ке жазу қажет болғандықтан async.
 * @param {{uid:string, email:string}} user
 * @returns {Promise<{allowed:boolean, unlimited:boolean, reason?:string}>}
 */
export async function checkAccess(user) {
  const email = user?.email;
  const uid   = user?.uid;

  if (!email || !uid) return { allowed: false, unlimited: false, reason: "no-user" };

  if (UNLIMITED_EMAILS.includes(email)) {
    return { allowed: true, unlimited: true };
  }

  if (ACCESS_MODE === "closed") {
    return { allowed: false, unlimited: false, reason: "closed" };
  }

  if (ACCESS_MODE === "open") {
    return { allowed: true, unlimited: false };
  }

  if (ACCESS_MODE === "slots") {
    // Бұл адам бұрын орын алған ба (қайта кіруі)?
    const slotRef = ref(db, `accessControl/grantedUsers/${uid}`);
    try {
      const already = await get(slotRef);
      if (already.val() === true) {
        return { allowed: true, unlimited: false };
      }
    } catch (e) { /* желі қатесі — төменде жаңа орын алуға тырысамыз */ }

    // Жаңа адам — бос орын бар ма? (transaction — екі адам бір сәтте
    // тырысса да, орын саны қате есептелмейді)
    const counterRef = ref(db, "accessControl/grantedCount");
    let granted = false;
    try {
      await runTransaction(counterRef, (current) => {
        const n = current || 0;
        if (n < MAX_SLOTS) { granted = true; return n + 1; }
        granted = false;
        return current;
      });
    } catch (e) {
      return { allowed: false, unlimited: false, reason: "network-error" };
    }

    if (!granted) {
      return { allowed: false, unlimited: false, reason: "full" };
    }

    try { await set(slotRef, true); } catch (e) {}
    return { allowed: true, unlimited: false };
  }

  return { allowed: false, unlimited: false, reason: "unknown-mode" };
}
