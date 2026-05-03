import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button, Select } from '../components/ui';
import { Wifi, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { initDefaultUsers, login, getSession, isValidEmail } from '../utils/authService';
import './Login.css';

/**
 * Componente Login
 * ----------------
 * Pantalla de acceso principal. Características:
 * - Solo acepta correos con formato válido (usuario@dominio.ext).
 * - Captcha matemático anti-bot.
 * - Validación de credenciales contra authService.
 * - Auto-registro de técnicos nuevos (primer acceso con email + pass + cuadrilla).
 * - Redirección por rol: ADMINISTRADOR/SUPERVISOR → /admin | TECNICO → /buscar.
 * - Mensajes de error descriptivos por campo.
 */
const Login = () => {
  const navigate = useNavigate();

  // ─── Estados del formulario ────────────────────────────────────────────
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [cuadrilla, setCuadrilla]             = useState('');
  const [cuadrillaCustom, setCuadrillaCustom] = useState('');
  const [errorMsg, setErrorMsg]               = useState('');
  const [emailError, setEmailError]           = useState('');

  // ─── Estados del Captcha ───────────────────────────────────────────────
  const [captchaNum1, setCaptchaNum1]         = useState(0);
  const [captchaNum2, setCaptchaNum2]         = useState(0);
  const [captchaAnswer, setCaptchaAnswer]     = useState('');

  // ─── Catálogo de cuadrillas ────────────────────────────────────────────
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

  /**
   * Genera dos números aleatorios para el captcha de suma.
   */
  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
    setCaptchaAnswer('');
  };

  /**
   * Valida formato de email al perder el foco del campo.
   */
  const handleEmailBlur = () => {
    if (email && !isValidEmail(email)) {
      setEmailError('Ingresa un correo válido (ej. tecnico@win.pe)');
    } else {
      setEmailError('');
    }
  };
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Maneja el envío del formulario de login.
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Validar formato de email
    if (!isValidEmail(email)) {
      setEmailError('Ingresa un correo electrónico válido (ej. tecnico@win.pe).');
      return;
    }

    // 2. Validar captcha
    if (parseInt(captchaAnswer) !== (captchaNum1 + captchaNum2)) {
      setErrorMsg('Error en el desafío de seguridad. Inténtalo de nuevo.');
      generateCaptcha();
      return;
    }

    // 3. Validar campos mínimos
    if (!email || !password) {
      setErrorMsg('Completa tu correo y contraseña.');
      return;
    }

    // 4. Intentar login contra authService
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);
    
    if (!result.success) {
      setErrorMsg(result.error);
      generateCaptcha();
      return;
    }

    // 6. Redirigir según rol
    navigate(result.session.role === 'TECNICO' ? '/buscar' : '/admin');
  };

  return (
    <div className="login-page-container">
      <div className="login-form-wrapper animate-fade-in">

        {/* ─── Encabezado ─────────────────────────────────────────────── */}
        <div className="login-header">
          <div className="login-logo-container">
            <Wifi size={32} color="white" />
          </div>
          <h1 className="login-title">Portal WIN</h1>
          <p className="login-subtitle">Acceso Técnico y Supervisión</p>
        </div>

        {/* ─── Formulario ─────────────────────────────────────────────── */}
        <Card>
          <form className="login-form" onSubmit={handleLogin}>

            {/* Mensaje de error global */}
            {errorMsg && (
              <div className="login-error-msg animate-fade-in">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Campo email */}
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
              {emailError && (
                <p className="login-field-error">{emailError}</p>
              )}
            </div>

            {/* Campo contraseña con toggle visibilidad */}
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

            {/* Selector de cuadrilla */}
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


            {/* ─── Captcha Anti-Bot ─────────────────────────────────── */}
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
    </div>
  );
};

export default Login;
