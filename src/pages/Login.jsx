import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button, Select } from '../components/ui';
import { Wifi, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff, Key, CheckCircle } from 'lucide-react';
import { initDefaultUsers, login, getSession, isValidEmail, changePassword } from '../utils/authService';
import { useUI } from '../components/ui/Modal.jsx';
import './Login.css';

/**
 * Componente Login
 * ─────────────────
 * - Captcha matemático anti-bot.
 * - Validación de cuadrilla (solo TECNICO).
 * - Flujo de primer ingreso: si must_change_password=true, muestra overlay de cambio de contraseña.
 * - Toasts y Modales estéticos en lugar de alert().
 */
const Login = () => {
  const navigate = useNavigate();
  const { showModal, showToast } = useUI();

  // ─── Estados del formulario principal ─────────────────────────────────
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [cuadrilla, setCuadrilla]             = useState('');
  const [cuadrillaCustom, setCuadrillaCustom] = useState('');
  const [errorMsg, setErrorMsg]               = useState('');
  const [emailError, setEmailError]           = useState('');
  const [isLoading, setIsLoading]             = useState(false);

  // ─── Captcha ──────────────────────────────────────────────────────────
  const [captchaNum1, setCaptchaNum1]     = useState(0);
  const [captchaNum2, setCaptchaNum2]     = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  // ─── Overlay de primer ingreso / cambio de contraseña ─────────────────
  const [showChangePwd, setShowChangePwd]   = useState(false);
  const [newPwd, setNewPwd]                 = useState('');
  const [confirmPwd, setConfirmPwd]         = useState('');
  const [showNewPwd, setShowNewPwd]         = useState(false);
  const [pwdError, setPwdError]             = useState('');
  const [isSavingPwd, setIsSavingPwd]       = useState(false);

  // ─── Catálogo de cuadrillas ───────────────────────────────────────────
  const opcionesCuadrilla = [
    { label: 'Seleccione su cuadrilla...', value: '' },
    { label: 'LIMA-NTE-01 (Los Olivos/SMP)', value: 'LIMA-NTE-01' },
    { label: 'LIMA-SUR-05 (Surco/Miraflores)', value: 'LIMA-SUR-05' },
    { label: 'LIMA-ESTE-03 (SJL/Ate)', value: 'LIMA-ESTE-03' },
    { label: 'CALLAO-02 (Bellavista/La Perla)', value: 'CALLAO-02' },
    { label: 'PROV-PIURA-01', value: 'PROV-PIURA-01' },
    { label: 'Otro (Especificar)', value: 'Otro' }
  ];

  // ─── Inicialización ───────────────────────────────────────────────────
  useEffect(() => {
    initDefaultUsers();
    generateCaptcha();
  }, []);

  // Redirigir si ya tiene sesión activa
  useEffect(() => {
    const session = getSession();
    if (session) {
      navigate(session.role === 'TECNICO' ? '/buscar' : '/admin');
    }
  }, [navigate]);

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
    setCaptchaAnswer('');
  };

  const handleEmailBlur = () => {
    if (email && !isValidEmail(email)) {
      setEmailError('Ingresa un correo válido (ej. tecnico@win.pe)');
    } else {
      setEmailError('');
    }
  };

  // ─── Submit de Login ──────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isValidEmail(email)) {
      setEmailError('Ingresa un correo electrónico válido.');
      return;
    }

    if (parseInt(captchaAnswer) !== (captchaNum1 + captchaNum2)) {
      setErrorMsg('Error en el desafío de seguridad. Inténtalo de nuevo.');
      generateCaptcha();
      return;
    }

    if (!email || !password) {
      setErrorMsg('Completa tu correo y contraseña.');
      return;
    }

    // Determinar cuadrilla a validar
    const finalCuadrilla = cuadrilla === 'Otro' ? cuadrillaCustom : cuadrilla;

    setIsLoading(true);
    const result = await login(email, password, finalCuadrilla);
    setIsLoading(false);

    if (!result.success) {
      // Error especial de cuadrilla incorrecta
      if (result.error === 'WRONG_CUADRILLA') {
        showModal({
          type: 'error',
          title: 'Cuadrilla Incorrecta',
          message: 'La cuadrilla seleccionada no corresponde a tu cuenta. Por favor verifica tu cuadrilla asignada con el Administrador.'
        });
        generateCaptcha();
        return;
      }
      setErrorMsg(result.error);
      generateCaptcha();
      return;
    }

    // ¿Es primer ingreso o contraseña reseteada?
    if (result.mustChangePassword) {
      setShowChangePwd(true);
      return;
    }

    // Redirigir según rol
    showToast({ type: 'success', title: `¡Bienvenido, ${result.session.nombre || result.session.email}!` });
    navigate(result.session.role === 'TECNICO' ? '/buscar' : '/admin');
  };

  // ─── Submit de cambio de contraseña ──────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');

    if (!newPwd || !confirmPwd) {
      setPwdError('Completa ambos campos.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Las contraseñas no coinciden.');
      return;
    }

    setIsSavingPwd(true);
    const result = await changePassword(newPwd);
    setIsSavingPwd(false);

    if (!result.success) {
      setPwdError(result.error);
      return;
    }

    const session = getSession();
    showModal({
      type: 'success',
      title: '¡Contraseña establecida!',
      message: 'Tu contraseña ha sido guardada exitosamente. Ya puedes usar el sistema.',
      confirmLabel: 'Continuar',
      onConfirm: () => {
        navigate(session?.role === 'TECNICO' ? '/buscar' : '/admin');
      }
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="login-page-container">
      <div className="login-form-wrapper animate-fade-in">

        {/* ─── Encabezado ───────────────────────────────────────────────── */}
        <div className="login-header">
          <div className="login-logo-container">
            <Wifi size={32} color="white" />
          </div>
          <h1 className="login-title">Portal WIN</h1>
          <p className="login-subtitle">Acceso Técnico y Supervisión</p>
        </div>

        {/* ─── Formulario ───────────────────────────────────────────────── */}
        <Card>
          <form className="login-form" onSubmit={handleLogin}>

            {/* Mensaje de error inline */}
            {errorMsg && (
              <div className="login-error-msg animate-fade-in">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <Input
                label="Correo Electrónico (*)"
                type="email"
                placeholder="tecnico@win.pe"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); setEmailError(''); }}
                onBlur={handleEmailBlur}
                required
              />
              {emailError && <p className="login-field-error">{emailError}</p>}
            </div>

            {/* Contraseña */}
            <div className="login-password-wrapper">
              <Input
                label="Contraseña (*)"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 chars, mayúscula, número y símbolo"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Cuadrilla */}
            <Select
              label="Cuadrilla Asignada (*)"
              value={cuadrilla}
              onChange={e => setCuadrilla(e.target.value)}
              options={opcionesCuadrilla}
            />
            {cuadrilla === 'Otro' && (
              <Input
                label="Especificar Cuadrilla/Distrito"
                placeholder="Ej: AQP-SUR-01"
                value={cuadrillaCustom}
                onChange={e => setCuadrillaCustom(e.target.value)}
                required
              />
            )}

            {/* Captcha */}
            <div className="login-captcha-section">
              <div className="login-captcha-label">
                <ShieldCheck size={18} color="var(--win-orange)" />
                <span>Verificación de Seguridad</span>
              </div>
              <p className="login-captcha-question">
                ¿Cuánto es {captchaNum1} + {captchaNum2}?
              </p>
              <Input
                type="number"
                placeholder="Tu respuesta..."
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="login-submit-btn" disabled={isLoading}>
              {isLoading ? 'Iniciando Sesión...' : 'Ingresar'} <ArrowRight size={18} />
            </Button>

          </form>
        </Card>
      </div>

      {/* ─── OVERLAY: Cambio de Contraseña Obligatorio ──────────────────── */}
      {showChangePwd && (
        <div className="pwd-change-overlay">
          <div className="pwd-change-card animate-fade-in">
            
            <div className="pwd-change-icon-wrapper">
              <div className="pwd-change-icon-pulse" />
              <Key size={30} className="pwd-change-icon" />
            </div>

            <h2 className="pwd-change-title">Crea tu Contraseña Personal</h2>
            <p className="pwd-change-subtitle">
              Es tu primer ingreso (o tu contraseña fue reseteada por el Administrador).<br />
              Por seguridad, debes establecer una contraseña propia ahora.
            </p>

            <form onSubmit={handleChangePassword} className="pwd-change-form">
              <div className="login-password-wrapper">
                <Input
                  label="Nueva Contraseña"
                  type={showNewPwd ? 'text' : 'password'}
                  placeholder="Mín. 8 chars, mayúscula, número y símbolo"
                  value={newPwd}
                  onChange={e => { setNewPwd(e.target.value); setPwdError(''); }}
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                >
                  {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <Input
                label="Confirmar Nueva Contraseña"
                type="password"
                placeholder="Repite la contraseña"
                value={confirmPwd}
                onChange={e => { setConfirmPwd(e.target.value); setPwdError(''); }}
                required
              />

              {pwdError && (
                <div className="login-error-msg">
                  <AlertCircle size={16} />
                  <span>{pwdError}</span>
                </div>
              )}

              <Button type="submit" className="login-submit-btn" disabled={isSavingPwd}>
                {isSavingPwd ? 'Guardando...' : <><CheckCircle size={18} /> Guardar Contraseña</>}
              </Button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
