import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button, Select } from '../components/ui';
import { Wifi, ArrowRight, ShieldCheck } from 'lucide-react';
import './Login.css';

/**
 * Componente Login
 * Representa la pantalla de acceso principal para los técnicos y supervisores.
 */
const Login = () => {
  const navigate = useNavigate();
  
  // Estados locales para capturar los datos del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cuadrilla, setCuadrilla] = useState('');
  const [cuadrillaCustom, setCuadrillaCustom] = useState('');
  
  // Estados para el CAPTCHA Matemático
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const opcionesCuadrilla = [
    { label: 'Seleccione su cuadrilla...', value: '' },
    { label: 'LIMA-NTE-01 (Los Olivos/SMP)', value: 'LIMA-NTE-01' },
    { label: 'LIMA-SUR-05 (Surco/Miraflores)', value: 'LIMA-SUR-05' },
    { label: 'LIMA-ESTE-03 (SJL/Ate)', value: 'LIMA-ESTE-03' },
    { label: 'CALLAO-02 (Bellavista/La Perla)', value: 'CALLAO-02' },
    { label: 'PROV-PIURA-01', value: 'PROV-PIURA-01' },
    { label: 'Otro (Especificar)', value: 'Otro' }
  ];

  // Generar CAPTCHA al montar el componente
  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1); // 1-10
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1); // 1-10
    setCaptchaAnswer('');
  };

  // Si ya tiene sesión activa, mandarlo a buscar
  useEffect(() => {
    const sessionStr = localStorage.getItem('win_session');
    if (sessionStr) {
      navigate('/buscar');
    }
  }, [navigate]);

  /**
   * Valida los campos y establece la sesión en localStorage.
   */
  const handleLogin = (e) => {
    e.preventDefault(); 
    
    // 1. Verificación del Captcha
    if (parseInt(captchaAnswer) !== (captchaNum1 + captchaNum2)) {
      alert("Error en el desafío de seguridad (Captcha). Inténtalo de nuevo.");
      generateCaptcha();
      return;
    }

    // 2. Verificación de SUPERVISOR / ADMINISTRADOR (Mock)
    if (email === 'admin' && password === 'admin') {
      localStorage.setItem('win_session', JSON.stringify({
        email: 'ADMINISTRADOR GENERAL',
        role: 'ADMINISTRADOR',
        cuadrilla: 'GERENCIA'
      }));
      navigate('/admin');
      return;
    }
    
    if (email === 'super' && password === 'super') {
      localStorage.setItem('win_session', JSON.stringify({
        email: 'SUPERVISOR ZONAL',
        role: 'SUPERVISOR',
        cuadrilla: 'LIMA-NTE-01'
      }));
      navigate('/admin');
      return;
    }

    // 3. Verificación de TÉCNICO NORMAL
    if (email && password && cuadrilla) {
      if (cuadrilla === 'Otro' && !cuadrillaCustom) {
         alert('Por favor especifica el nombre de tu cuadrilla y distrito');
         return;
      }
      
      const finalCuadrilla = cuadrilla === 'Otro' ? cuadrillaCustom : cuadrilla;
      
      localStorage.setItem('win_session', JSON.stringify({
        email,
        role: 'TECNICO',
        cuadrilla: finalCuadrilla,
        cuadrillaPersonalizada: cuadrillaCustom
      }));

      navigate('/buscar');
    } else {
      alert("Por favor completa todos los campos requeridos, incluyendo tu Cuadrilla.");
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-form-wrapper animate-fade-in">
        
        {/* Encabezado con Icono y Texto */}
        <div className="login-header">
          <div className="login-logo-container">
             <Wifi size={32} color="white" />
          </div>
          <h1 className="login-title">Portal WIN</h1>
          <p className="login-subtitle">Acceso Técnico y Supervisión</p>
        </div>

        {/* Tarjeta con los campos del formulario */}
        <Card>
          <form className="login-form" onSubmit={handleLogin}>
            <Input 
              label="Usuario o Correo (*)" 
              type="text" 
              placeholder="tecnico@win.pe o 'admin'" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input 
              label="Contraseña (*)" 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
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

            {/* SECCIÓN CAPTCHA */}
            <div style={{ marginTop: '1.5rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '10px' }}>
                <ShieldCheck size={18} color="var(--win-orange)" />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Seguridad Anti-Bot</span>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
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
