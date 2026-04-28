import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button, Select } from '../components/ui';
import { Wifi, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { initDefaultUsers, login, getSession } from '../utils/authService';
import './Login.css';

/**
 * Componente Login
 * ----------------
 * Pantalla de acceso principal. Características:
 * - Captcha matemático anti-bot.
 * - Validación de credenciales contra el servicio local (authService).
 * - Auto-registro de técnicos nuevos (se crean en la base local al primer login).
 * - Redirección según rol:
 *     ADMINISTRADOR / SUPERVISOR → /admin
 *     TECNICO                    → /buscar
 * - Mensajes descriptivos si la cuenta está bloqueada.
 */
const Login = () => {
  const navigate = useNavigate();
  
  // ─── Estados del formulario ────────────────────────────────────────────
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [cuadrilla, setCuadrilla]         = useState('');
  const [cuadrillaCustom, setCuadrillaCustom] = useState('');
  const [errorMsg, setErrorMsg]           = useState('');
  
  // ─── Estados del Captcha ───────────────────────────────────────────────
  const [captchaNum1, setCaptchaNum1]     = useState(0);
  const [captchaNum2, setCaptchaNum2]     = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

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
    // Crear usuarios semilla si es la primera ejecución
    initDefaultUsers();
    generateCaptcha();
  }, []);

  // Si ya tiene sesión activa, redirigir inmediatamente
  useEffect(() => {
    const session = getSession();
    if (session) {
      const dest = (session.role === 'ADMINISTRADOR' || session.role === 'SUPERVISOR') 
        ? '/admin' 
        : '/buscar';
      navigate(dest);
    }
  }, [navigate]);

  /**
   * Genera dos números aleatorios entre 1 y 10 para el captcha.
   */
  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
    setCaptchaAnswer('');
  };

  /**
   * Maneja el envío del formulario de login.
   */
  const handleLogin = (e) => {
    e.preventDefault(); 
    setErrorMsg('');
    
    // 1. Validar Captcha
    if (parseInt(captchaAnswer) !== (captchaNum1 + captchaNum2)) {
      setErrorMsg('Error en el desafío de seguridad (Captcha). Inténtalo de nuevo.');
      generateCaptcha();
      return;
    }

    // 2. Determinar cuadrilla final
    const finalCuadrilla = cuadrilla === 'Otro' ? cuadrillaCustom : cuadrilla;
    
    // 3. Validar campos mínimos
    if (!email || !password) {
      setErrorMsg('Por favor completa tu usuario y contraseña.');
      return;
    }

    // 4. Intentar login contra authService
    const result = login(email, password, finalCuadrilla);

    if (!result.success) {
      setErrorMsg(result.error);
      generateCaptcha();
      return;
    }

    // 5. Redireccionar según rol
    const dest = (result.session.role === 'ADMINISTRADOR' || result.session.role === 'SUPERVISOR') 
      ? '/admin' 
      : '/buscar';
    navigate(dest);
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
            
            {/* Mensaje de error */}
            {errorMsg && (
              <div className="login-error-msg animate-fade-in">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <Input 
              label="Usuario o Correo (*)" 
              type="text" 
              placeholder="tecnico@win.pe o 'admin'" 
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
              required
            />
            <Input 
              label="Contraseña (*)" 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
              required
            />
            
            {/* Selector de cuadrilla */}
            <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              <Select 
                label="Cuadrilla Asignada (*)" 
                value={cuadrilla}
                onChange={e => setCuadrilla(e.target.value)}
                options={opcionesCuadrilla}
              />
            </div>

            {cuadrilla === 'Otro' && (
              <div style={{ marginBottom: '1rem' }}>
                <Input 
                  label="Especificar Cuadrilla/Distrito" 
                  placeholder="Ej: AQP-SUR-01 (Bustamante)"
                  value={cuadrillaCustom}
                  onChange={e => setCuadrillaCustom(e.target.value)}
                  required
                />
              </div>
            )}

            {/* ─── Captcha Anti-Bot ─────────────────────────────────── */}
            <div className="login-captcha-section">
              <div className="login-captcha-label">
                <ShieldCheck size={18} color="var(--win-orange)" />
                <span>Seguridad Anti-Bot</span>
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
            
            <Button type="submit" className="login-submit-btn" style={{ marginTop: '0.5rem' }}>
              Ingresar <ArrowRight size={18} />
            </Button>
          </form>
        </Card>
        
      </div>
    </div>
  );
};

export default Login;
