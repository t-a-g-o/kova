import { AnimatePresence, motion } from 'motion/react';
import { Check, Lock, Mail, MailCheck, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authMessage, useAuth } from '../../lib/auth';
import { cn } from '../../lib/utils';
import { LogoMark } from '../../components/Logo';
import { Button, Input } from '../../components/ui';
import { AuthLayout, GoogleIcon, authItem, authStagger } from './AuthLayout';

const emailOk = (e: string) => /^\S+@\S+\.\S+$/.test(e);

function FormError({ msg }: { msg: string }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          className="overflow-hidden"
        >
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-500">{msg}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold tracking-wider text-faint uppercase">
      <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** App-style screen heading: big icon on the welcome screen, large title elsewhere. */
function Hero({ title, sub, icon }: { title: string; sub: string; icon?: boolean }) {
  return (
    <>
      {icon && (
        <motion.div variants={authItem} className="mt-6 mb-7 flex justify-center">
          <div className="rounded-[26px] shadow-[0_16px_50px_-10px_rgba(109,91,255,0.75)]">
            <LogoMark size={84} animated />
          </div>
        </motion.div>
      )}
      <motion.h1 variants={authItem} className={cn('font-display text-[30px] leading-tight font-extrabold', icon ? 'text-center' : 'mt-2')}>
        {title}
      </motion.h1>
      <motion.p variants={authItem} className={cn('mt-2 mb-8 text-[15px] text-muted', icon && 'text-center')}>
        {sub}
      </motion.p>
    </>
  );
}

function GoogleButton() {
  const { google } = useAuth();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        block
        loading={loading}
        onClick={async () => {
          setLoading(true);
          setErr('');
          try {
            await google();
          } catch (e) {
            setErr(authMessage(e));
            setLoading(false);
          }
        }}
      >
        <GoogleIcon /> Continue with Google
      </Button>
      {err && <p className="mt-2 text-center text-sm text-rose-500">{err}</p>}
    </>
  );
}

export function SignIn() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [touched, setTouched] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailOk(email) || !pw) return;
    setLoading(true);
    setErr('');
    try {
      await signIn(email.trim(), pw);
      nav((loc.state as { from?: string })?.from ?? '/', { replace: true });
    } catch (e) {
      setErr(authMessage(e));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      footer={
        <>
          <Button type="submit" form="signin" size="lg" block loading={loading}>
            Sign in
          </Button>
          <GoogleButton />
          <p className="pt-1 text-center text-sm text-muted">
            New to Kova?{' '}
            <Link to="/signup" className="font-semibold text-iris-500">
              Create an account
            </Link>
          </p>
        </>
      }
    >
      <motion.form id="signin" variants={authStagger} initial="hidden" animate="show" onSubmit={submit} noValidate>
        <Hero icon title="Welcome back" sub="Sign in to manage your payments." />
        <motion.div variants={authItem}>
          <FormError msg={err} />
        </motion.div>
        <motion.div variants={authItem} className="space-y-4">
          <Input
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="you@example.com"
            icon={<Mail />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={touched && !emailOk(email) ? 'Enter a valid email address.' : undefined}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            icon={<Lock />}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            error={touched && !pw ? 'Enter your password.' : undefined}
          />
          <div className="flex justify-end">
            <Link to="/forgot" className="text-[13px] font-semibold text-iris-500">
              Forgot password?
            </Link>
          </div>
        </motion.div>
      </motion.form>
    </AuthLayout>
  );
}

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s++;
  return s;
}
const strengthMeta = [
  { label: 'Too short', color: 'bg-rose-500' },
  { label: 'Weak', color: 'bg-rose-500' },
  { label: 'Fair', color: 'bg-amber-400' },
  { label: 'Good', color: 'bg-iris-500' },
  { label: 'Strong', color: 'bg-mint-400' },
];

export function SignUp() {
  const { signUp } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [touched, setTouched] = useState(false);
  const s = strength(pw);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || !emailOk(email) || pw.length < 8) return;
    if (!agree) return setErr('Please agree to the Terms to continue.');
    setLoading(true);
    setErr('');
    try {
      await signUp(name.trim(), email.trim(), pw);
      nav('/', { replace: true });
    } catch (e) {
      setErr(authMessage(e));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      back="/signin"
      footer={
        <>
          <Button type="submit" form="signup" size="lg" block loading={loading}>
            Create account
          </Button>
          <Divider />
          <GoogleButton />
        </>
      }
    >
      <motion.form id="signup" variants={authStagger} initial="hidden" animate="show" onSubmit={submit} noValidate>
        <Hero title="Create your account" sub="It takes less than a minute. Checking eligibility won’t affect your credit score." />
        <motion.div variants={authItem}>
          <FormError msg={err} />
        </motion.div>
        <motion.div variants={authItem} className="space-y-4">
          <Input
            label="Full name"
            autoComplete="name"
            placeholder="Alex Morgan"
            icon={<User />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={touched && !name.trim() ? 'Enter your name.' : undefined}
          />
          <Input
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="you@example.com"
            icon={<Mail />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={touched && !emailOk(email) ? 'Enter a valid email address.' : undefined}
          />
          <div>
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              icon={<Lock />}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              error={touched && pw.length < 8 ? 'Use at least 8 characters.' : undefined}
            />
            <AnimatePresence>
              {pw && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="flex items-center gap-3 pt-2.5">
                    <div className="flex flex-1 gap-1.5">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                          <motion.div
                            className={cn('h-full rounded-full', strengthMeta[s].color)}
                            initial={false}
                            animate={{ width: i < s ? '100%' : '0%' }}
                            transition={{ duration: 0.3, delay: i * 0.04 }}
                          />
                        </div>
                      ))}
                    </div>
                    <span className="w-16 text-right text-xs font-semibold text-muted">{strengthMeta[s].label}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        <motion.div variants={authItem} className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-muted">
          <button
            type="button"
            onClick={() => setAgree((a) => !a)}
            className={cn(
              'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-all',
              agree ? 'border-iris-500 bg-iris-500 text-white' : 'border-line bg-surface',
            )}
          >
            <AnimatePresence>{agree && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="size-3.5" strokeWidth={3} /></motion.span>}</AnimatePresence>
          </button>
          <span onClick={() => setAgree((a) => !a)}>
            I agree to Kova’s <span className="font-semibold text-ink">Terms of Service</span>, which mostly promise that nobody here is taking my money.
          </span>
        </motion.div>
      </motion.form>
    </AuthLayout>
  );
}

export function Forgot() {
  const { reset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailOk(email)) return setErr('Enter a valid email address.');
    setLoading(true);
    setErr('');
    try {
      await reset(email.trim());
      setSent(true);
    } catch (e) {
      setErr(authMessage(e));
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      back="/signin"
      footer={
        sent ? (
          <Link to="/signin" className="block">
            <Button size="lg" block>
              Back to sign in
            </Button>
          </Link>
        ) : (
          <Button type="submit" form="forgot" size="lg" block loading={loading}>
            Send reset link
          </Button>
        )
      }
    >
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div key="sent" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="pt-16 text-center">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              className="mx-auto mb-6 grid size-20 place-items-center rounded-[28px] bg-mint-400/15 text-mint-500"
            >
              <MailCheck className="size-9" />
            </motion.div>
            <h1 className="font-display text-[28px] font-extrabold">Check your inbox</h1>
            <p className="mt-2 text-muted">
              If an account exists for <span className="font-semibold text-ink">{email}</span>, you’ll get a link to reset your password.
            </p>
          </motion.div>
        ) : (
          <motion.form id="forgot" key="form" variants={authStagger} initial="hidden" animate="show" exit={{ opacity: 0 }} onSubmit={submit} noValidate>
            <Hero title="Reset password" sub="Enter your email and we’ll send you a reset link." />
            <motion.div variants={authItem}>
              <Input
                label="Email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                placeholder="you@example.com"
                icon={<Mail />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={err}
              />
            </motion.div>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
