/**
 * UI chrome strings — EN default, RU via ?lang=ru cookie.
 *
 * This file is the only source of translations. Two .properties files used to
 * sit beside it holding a divergent copy of the same keys; nothing imported
 * them, so they were deleted rather than left as a trap for the next edit.
 *
 * Keys for the retired nav, projects grid, blog teaser and multi-column footer
 * were removed with the chrome that used them.
 */
export const EN: Record<string, string> = {
  'nav.skip': 'Skip to content',
  'nav.theme': 'Switch color theme',
  'nav.lang': 'Change language',
  'meta.fallback': 'Software engineer in Tashkent',

  'page.home': 'Portfolio',
  'page.blog': 'Blog',
  'page.login': 'Sign in',

  // These two carry inline markup and are rendered with raw(). That is safe
  // because they are compile-time constants in this file — author-controlled,
  // never user input. Anything that ever comes from the CMS must not be
  // rendered this way.
  'intro.p1': "I'm a software engineer who builds products end to end — backend, frontend, mobile.",
  'intro.p2': "Right now I'm the main programmer at <a href=\"https://yodla-app.uz\" target=\"_blank\" rel=\"noopener\">Yodla</a>, which reaches 500,000 users, and at <a href=\"https://avtodars-avtomaktab.uz\" target=\"_blank\" rel=\"noopener\">Avtodars</a>. On the side I'm building my own startup, <a href=\"https://birga-app.uz\" target=\"_blank\" rel=\"noopener\">Birga</a>.",

  'work.title': 'Work history',
  'work.present': 'Present',
  'work.empty': 'Nothing here yet.',

  'cta.telegram': 'Telegram',
  'cta.email': 'Email',

  'blog.minread': '{0} min read',
  'blog.min': '{0} min',
  'blog.masthead.title': 'The Blog',
  'blog.masthead.notes': 'Field notes',
  'blog.masthead.freq': 'Published irregularly',
  'blog.eyebrow': 'The blog',
  'blog.title': 'Essays on <em>craft</em>, code, and the quiet in between.',
  'blog.sub': 'Short field notes from building things.',
  'blog.empty': 'No posts published yet.',
  'post.back': '← Back to blog',
  'post.all': '← All posts',
  'post.views': 'Viewed <b>{0}</b> times',

  'login.private': 'Private',
  'login.title': 'Welcome <em>back</em>.',
  'login.sub': 'Sign in to manage your portfolio.',
  'login.username': 'Username',
  'login.password': 'Password',
  'login.submit': 'Sign in',
  'login.error': 'Incorrect username or password.',
  'login.signedout': 'You\'ve been signed out.',
  'login.back': '← Back to site',
}

export const RU: Record<string, string> = {
  'nav.skip': 'К основному содержанию',
  'nav.theme': 'Сменить тему',
  'nav.lang': 'Сменить язык',
  'meta.fallback': 'Инженер-программист в Ташкенте',

  'page.home': 'Портфолио',
  'page.blog': 'Блог',
  'page.login': 'Вход',

  'intro.p1': 'Я инженер-программист и делаю продукты целиком — бэкенд, фронтенд, мобильные приложения.',
  'intro.p2': 'Сейчас я главный программист в <a href="https://yodla-app.uz" target="_blank" rel="noopener">Yodla</a> — 500 000 пользователей — и в <a href="https://avtodars-avtomaktab.uz" target="_blank" rel="noopener">Avtodars</a>. Параллельно развиваю свой стартап <a href="https://birga-app.uz" target="_blank" rel="noopener">Birga</a>.',

  'work.title': 'Опыт работы',
  'work.present': 'н.в.',
  'work.empty': 'Пока пусто.',

  'cta.telegram': 'Telegram',
  'cta.email': 'Почта',

  'blog.minread': '{0} мин чтения',
  'blog.min': '{0} мин',
  'blog.masthead.title': 'Блог',
  'blog.masthead.notes': 'Полевые заметки',
  'blog.masthead.freq': 'Выходит нерегулярно',
  'blog.eyebrow': 'Блог',
  'blog.title': 'Эссе о <em>ремесле</em>, коде и тишине между ними.',
  'blog.sub': 'Короткие заметки о том, как я строю вещи.',
  'blog.empty': 'Записей пока нет.',
  'post.back': '← Назад в блог',
  'post.all': '← Все записи',
  'post.views': 'Просмотров: <b>{0}</b>',

  'login.private': 'Приватная зона',
  'login.title': 'С <em>возвращением</em>.',
  'login.sub': 'Войдите, чтобы управлять портфолио.',
  'login.username': 'Логин',
  'login.password': 'Пароль',
  'login.submit': 'Войти',
  'login.error': 'Неверный логин или пароль.',
  'login.signedout': 'Вы вышли из системы.',
  'login.back': '← На сайт',
}

export type Lang = 'en' | 'ru'

export function t(lang: Lang, key: string, ...args: (string | number)[]): string {
  const table = lang === 'ru' ? RU : EN
  let s = table[key] ?? EN[key] ?? key
  args.forEach((a, i) => { s = s.replace(`{${i}}`, String(a)) })
  return s
}

export function pick(lang: Lang, en: string | null | undefined, ru: string | null | undefined): string {
  if (lang === 'ru' && ru && ru.trim()) return ru
  return en ?? ''
}
