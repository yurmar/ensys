import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useStore } from '../store';

export function Login() {
  const { admin } = useStore();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      await api.login(String(fd.get('login')), String(fd.get('password')));
      location.assign('/');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <img src="/assets/ensys-mark-color.svg" alt="" width="854" height="599" className="login-mark" />
        <p className="eyebrow">Администратор</p>
        <h1 className="login-title">Вход</h1>
        {admin && <p className="form-status">Вы уже вошли. <a href="/">Перейти на сайт</a></p>}
        <label className="field">Логин<input name="login" autoComplete="username" required autoFocus /></label>
        <label className="field">Пароль<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p className="modal-error" role="alert">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Вхожу…' : 'Войти'}</button>
        <a className="login-back" href="/">← На сайт</a>
      </form>
    </main>
  );
}
