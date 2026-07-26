import * as React from 'react';
import Helmet from 'react-helmet';

import * as styles from './index.module.css';

const WORDS = [
  'قمر',
  'نخلة',
  'سفينة',
  'مفتاح',
  'صقر',
  'سوق',
  'قلعة',
  'طبيب',
  'بحر',
  'نافذة',
  'كتاب',
  'برق',
  'خيمة',
  'ساعة',
  'وردة',
  'جسر',
  'نهر',
  'ذهب',
  'طائرة',
  'مرآة',
  'قهوة',
  'جبل',
  'مصباح',
  'سحابة',
  'لؤلؤ',
  'مسرح',
  'نجم',
  'حديقة',
  'مطار',
  'رسالة',
  'خريطة',
  'رمل',
  'مكتبة',
  'فرس',
  'شمس',
  'مطر',
  'باب',
  'تاج',
  'قطار',
  'مدينة',
];

const ROLES = {
  blue: 'أزرق',
  red: 'أحمر',
  neutral: 'محايد',
  assassin: 'القاتل',
};

const TIMER_OPTIONS = {
  'بدون مؤقت': 0,
  '60 ثانية': 60,
  '90 ثانية': 90,
  '120 ثانية': 120,
};

const createDeck = () => {
  const cards = [...WORDS].sort(() => Math.random() - 0.5).slice(0, 25);
  const roles = [
    ...Array(9).fill('blue'),
    ...Array(8).fill('red'),
    ...Array(7).fill('neutral'),
    'assassin',
  ].sort(() => Math.random() - 0.5);

  return cards.map((word, index) => ({
    id: `${word}-${index}`,
    word,
    role: roles[index],
    revealed: false,
  }));
};

const IndexPage = () => {
  const [nickname, setNickname] = React.useState('');
  const [joined, setJoined] = React.useState(false);
  const [team, setTeam] = React.useState('blue');
  const [mode, setMode] = React.useState('players');
  const [timer, setTimer] = React.useState('بدون مؤقت');
  const [turn, setTurn] = React.useState('blue');
  const [deck, setDeck] = React.useState(createDeck);
  const [roomCode, setRoomCode] = React.useState('ARABIA-527');
  const [clueWord, setClueWord] = React.useState('صحراء');
  const [clueCount, setClueCount] = React.useState('2');
  const [activeClue, setActiveClue] = React.useState({
    word: 'صحراء',
    count: '2',
  });
  const [remainingTime, setRemainingTime] = React.useState(0);
  const [gameLog, setGameLog] = React.useState([
    'تم إنشاء غرفة تجريبية جاهزة للعب.',
  ]);

  const revealedCounts = deck.reduce(
    (acc, card) => {
      if (card.revealed && (card.role === 'blue' || card.role === 'red')) {
        acc[card.role] += 1;
      }
      return acc;
    },
    { blue: 0, red: 0 }
  );

  React.useEffect(() => {
    const seconds = TIMER_OPTIONS[timer];
    setRemainingTime(seconds);
  }, [timer, turn]);

  React.useEffect(() => {
    if (remainingTime <= 0) {
      return undefined;
    }

    const interval = setInterval(() => {
      setRemainingTime((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingTime]);

  const addLog = (message) => {
    setGameLog((entries) => [message, ...entries].slice(0, 6));
  };

  const newGame = () => {
    setDeck(createDeck());
    setTurn('blue');
    setRoomCode(`ARABIA-${Math.floor(100 + Math.random() * 900)}`);
    setActiveClue({ word: 'صحراء', count: '2' });
    addLog('بدأت لعبة جديدة وتم خلط الكلمات والأدوار.');
  };

  const startDemo = () => {
    setNickname('لاعب تجريبي');
    setJoined(true);
    setTeam('blue');
    setMode('spymaster');
    setTimer('90 ثانية');
    addLog('تم تشغيل تجربة سريعة: اختر بطاقة لكشفها وجرّب دور قائد الجواسيس.');
  };

  const submitClue = (event) => {
    event.preventDefault();
    setActiveClue({ word: clueWord, count: clueCount });
    addLog(`التلميح الحالي: ${clueWord} - ${clueCount}`);
  };

  const revealCard = (id) => {
    const selectedCard = deck.find((card) => card.id === id);

    if (!selectedCard || selectedCard.revealed) {
      return;
    }

    setDeck((cards) =>
      cards.map((card) => (card.id === id ? { ...card, revealed: true } : card))
    );
    addLog(`تم كشف «${selectedCard.word}» وكانت ${ROLES[selectedCard.role]}.`);

    if (selectedCard.role === 'assassin') {
      addLog('انتهت الجولة فوراً بسبب بطاقة القاتل.');
    }
  };

  const switchTurn = () => {
    setTurn((currentTurn) => (currentTurn === 'blue' ? 'red' : 'blue'));
    addLog('تم إنهاء الدور وانتقل اللعب للفريق الآخر.');
  };

  return (
    <main className={styles.page} dir="rtl">
      <Helmet>
        <title>أسماء سرية عربية | لعبة فرق عربية</title>
        <meta
          name="description"
          content="لعبة كلمات عربية مستوحاة من ألعاب التخمين الجماعية، مع فرق وإعدادات وغرفة قابلة للمشاركة."
        />
      </Helmet>

      <section className={styles.hero}>
        <div className={styles.language}>العربية</div>
        <div className={styles.logoMark}>أسماء سرية</div>
        <h1>العب لعبة الكلمات الجماعية أونلاين بالعربية</h1>
        <p>
          أنشئ غرفة، اختر فريقك، اضبط المؤقت وطريقة اللعب، ثم شارك الرابط مع
          أصدقائك وابدأوا تحدي كشف العملاء قبل الفريق الآخر.
        </p>

        {!joined ? (
          <form
            className={styles.joinCard}
            onSubmit={(event) => {
              event.preventDefault();
              setJoined(true);
            }}
          >
            <input
              aria-label="اسم اللاعب"
              placeholder="اكتب اسمك المستعار"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              required
            />
            <button type="submit">دخول اللعبة</button>
            <button
              type="button"
              className={styles.demoButton}
              onClick={startDemo}
            >
              تجربة سريعة
            </button>
          </form>
        ) : (
          <div className={styles.roomBanner}>
            <span>مرحباً {nickname}</span>
            <strong>رمز الغرفة: {roomCode}</strong>
          </div>
        )}
      </section>

      <section className={styles.settingsPanel} aria-label="إعدادات اللعبة">
        <div>
          <label>الفريق</label>
          <div className={styles.segmented}>
            <button
              className={team === 'blue' ? styles.activeBlue : ''}
              type="button"
              onClick={() => setTeam('blue')}
            >
              الأزرق
            </button>
            <button
              className={team === 'red' ? styles.activeRed : ''}
              type="button"
              onClick={() => setTeam('red')}
            >
              الأحمر
            </button>
            <button
              className={team === 'spectator' ? styles.activeNeutral : ''}
              type="button"
              onClick={() => setTeam('spectator')}
            >
              مشاهد
            </button>
          </div>
        </div>
        <div>
          <label>الدور</label>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="players">لاعبون يخمنون</option>
            <option value="spymaster">قائد الجواسيس</option>
          </select>
        </div>
        <div>
          <label>المؤقت</label>
          <select
            value={timer}
            onChange={(event) => setTimer(event.target.value)}
          >
            <option>بدون مؤقت</option>
            <option>60 ثانية</option>
            <option>90 ثانية</option>
            <option>120 ثانية</option>
          </select>
        </div>
        <button
          type="button"
          className={styles.primaryAction}
          onClick={newGame}
        >
          لعبة جديدة
        </button>
      </section>

      <section className={styles.gameShell}>
        <aside className={styles.scoreBoard}>
          <h2>لوحة الفرق</h2>
          <div className={styles.teamCardBlue}>
            <span>الفريق الأزرق</span>
            <strong>{revealedCounts.blue}/9</strong>
          </div>
          <div className={styles.teamCardRed}>
            <span>الفريق الأحمر</span>
            <strong>{revealedCounts.red}/8</strong>
          </div>
          <div className={styles.turnBox}>الدور الحالي: {ROLES[turn]}</div>
          <div className={styles.turnBox}>
            المؤقت: {remainingTime > 0 ? `${remainingTime}ث` : 'مغلق'}
          </div>
          <form className={styles.clueForm} onSubmit={submitClue}>
            <label>التلميح</label>
            <input
              value={clueWord}
              onChange={(event) => setClueWord(event.target.value)}
              aria-label="كلمة التلميح"
            />
            <select
              value={clueCount}
              onChange={(event) => setClueCount(event.target.value)}
              aria-label="عدد الكلمات"
            >
              <option>1</option>
              <option>2</option>
              <option>3</option>
              <option>4</option>
              <option>غير محدود</option>
            </select>
            <button type="submit">إرسال التلميح</button>
          </form>
          <div className={styles.currentClue}>
            <span>التلميح الحالي</span>
            <strong>
              {activeClue.word} / {activeClue.count}
            </strong>
          </div>
          <button type="button" onClick={switchTurn}>
            إنهاء الدور
          </button>
        </aside>

        <div className={styles.board}>
          {deck.map((card) => (
            <button
              key={card.id}
              className={`${styles.card} ${
                card.revealed ? styles[card.role] : ''
              } ${
                mode === 'spymaster' && !card.revealed ? styles.spyHint : ''
              }`}
              type="button"
              disabled={!joined}
              onClick={() => revealCard(card.id)}
            >
              <span>{card.word}</span>
              {(card.revealed || mode === 'spymaster') && (
                <small>{ROLES[card.role]}</small>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.instructions}>
        <h2>طريقة اللعب</h2>
        <div className={styles.logPanel}>
          <h3>سجل التجربة</h3>
          {gameLog.map((entry) => (
            <p key={entry}>{entry}</p>
          ))}
        </div>
        <ol>
          <li>اكتب اسمك واضغط دخول اللعبة.</li>
          <li>اختر الفريق والدور والإعدادات المناسبة للغرفة.</li>
          <li>شارك رمز الغرفة مع أصدقائك عبر أي محادثة صوتية أو مرئية.</li>
          <li>
            يعطي قائد الجواسيس تلميحاً من كلمة ورقم، ويحاول الفريق كشف البطاقات
            الصحيحة.
          </li>
        </ol>
      </section>
    </main>
  );
};

export default IndexPage;
