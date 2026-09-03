import React from 'react';
import { useAppContext } from '../context/AppContext';
import { auth } from '../lib/firebase';

const LoginPage: React.FC = () => {
    const { signIn } = useAppContext();
    const [isIframe, setIsIframe] = React.useState(false);

    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

    React.useEffect(() => {
        try {
            setIsIframe(window.self !== window.top);
        } catch (e) {
            setIsIframe(true);
        }
    }, []);

    const handleSignIn = async () => {
        console.log("Iniciando login con Google...");
        setErrorMsg(null);
        try {
            await signIn();
            console.log("Login exitoso");
        } catch (error: any) {
            console.error("Error en login:", error);
            let code = error?.code || '';
            let message = error?.message || '';
            
            if (code === 'auth/popup-blocked') {
                setErrorMsg("El navegador bloqueó la ventana emergente de inicio de sesión. Por favor, permite las ventanas emergentes o abre la aplicación en una pestaña nueva.");
            } else if (code === 'auth/unauthorized-domain') {
                 setErrorMsg(`El dominio actual (${window.location.hostname}) no está autorizado en Firebase. Agrégalo en la consola de Firebase (sin espacios ni https://).`);
            } else {
                 setErrorMsg(`Error al iniciar sesión: ${message || 'Error desconocido'}. Asegúrate de haber habilitado Google como proveedor de inicio de sesión en tu consola de Firebase.`);
            }
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-gray-750 text-center transition-all">
                <div className="flex justify-center mb-4">
                    <div className="bg-blue-50 dark:bg-blue-900/40 p-3.5 rounded-full text-blue-500">
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                </div>
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-2">
                    Módulo: Productos Culinarios
                </h1>
                <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
                    Introduce tus credenciales de Google para sincronizar tus calificaciones, grupos y alumnos con la nube de forma segura.
                </p>
                
                <button 
                    onClick={handleSignIn}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transform active:scale-[0.98] transition-all"
                >
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.743-.08-1.3-.176-1.859H12.24z"/>
                    </svg>
                    <span>Iniciar sesión con Google</span>
                </button>

                {errorMsg && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs leading-relaxed text-left">
                        <strong>⚠️ Error de inicio de sesión:</strong> {errorMsg}
                    </div>
                )}

                {/* Sección de ayuda de configuración de Firebase Propio */}
                <div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-5 text-left text-xs">
                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 select-none transition">
                            <span>🛠️ ¿Usas tu propio Firebase o tienes la app en Vercel? Solucionar problemas</span>
                            <span className="transform group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="mt-3.5 space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">1. Activar el inicio de sesión con Google en Firebase:</h4>
                                <ol className="list-decimal pl-4 space-y-1">
                                    <li>Entra a la <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">consola de Firebase</a> y abre tu proyecto <strong>Notas-Alumnos</strong>.</li>
                                    <li>En el menú izquierdo, ve a <strong>Authentication</strong>.</li>
                                    <li>Haz clic en la pestaña <strong>Sign-in method</strong> (Método de inicio de sesión).</li>
                                    <li>Haz clic en <strong>Agregar nuevo proveedor</strong> (Add new provider) y selecciona <strong>Google</strong>.</li>
                                    <li>Clica el interruptor de <strong>Habilitar</strong>, selecciona tu correo de soporte (<em>{auth.currentUser?.email || 'jcbmisweb@gmail.com'}</em>) y haz clic en <strong>Guardar</strong> (¡muy importante guardar!).</li>
                                </ol>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">2. Agregar dominios autorizados (para Vercel):</h4>
                                <ol className="list-decimal pl-4 space-y-1">
                                    <li>Dentro de <strong>Authentication</strong>, ve a la pestaña superior <strong>Configuración</strong> (Settings).</li>
                                    <li>En el menú de la izquierda, entra a <strong>Dominios autorizados</strong> (Authorized domains).</li>
                                    <li>Haz clic en <strong>Agregar dominio</strong> e introduce tu dominio de Vercel: <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-red-600 dark:text-red-400 text-[11px]">notas-lime.vercel.app</code> (sin https:// ni barras final).</li>
                                    <li>Agrega también el dominio de vista previa de AI Studio si estás probando aquí.</li>
                                </ol>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">3. Conectar tu código con Notas-Alumnos (En Vercel):</h4>
                                <p className="mb-2">
                                    Para usar tu base de datos definitiva en Vercel, debes configurar las **Variables de Entorno (Environment Variables)** en los ajustes de tu proyecto en Vercel.
                                </p>
                                <p className="mb-1"><em>Variables requeridas:</em></p>
                                <ul className="list-disc pl-4 space-y-1 mb-2">
                                    <li><code>VITE_FIREBASE_API_KEY</code></li>
                                    <li><code>VITE_FIREBASE_AUTH_DOMAIN</code></li>
                                    <li><code>VITE_FIREBASE_PROJECT_ID</code></li>
                                    <li><code>VITE_FIREBASE_STORAGE_BUCKET</code></li>
                                    <li><code>VITE_FIREBASE_MESSAGING_SENDER_ID</code></li>
                                    <li><code>VITE_FIREBASE_APP_ID</code></li>
                                </ul>
                                <p className="mt-2 text-slate-600 dark:text-slate-400">
                                    En AI Studio seguiremos utilizando la base de datos de pruebas configurada automáticamente, y al publicar en Vercel, detectará tus variables para conectarse a tu proyecto real.
                                </p>
                            </div>
                        </div>
                    </details>
                </div>

                {isIframe && (
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-750 text-left bg-amber-50/50 dark:bg-amber-950/10 p-4 rounded-xl border border-amber-100/50 dark:border-amber-900/30">
                        <div className="flex items-start space-x-2">
                            <span className="text-amber-500 mt-0.5 font-bold">⚠️ Nota para el navegador:</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                            Si estás utilizando Safari, el modo Incógnito o tu navegador restringe las cookies de terceros, el inicio de sesión o la actualización de alumnos en el panel incrustado puede no guardarse correctamente. Recomiendo **abrir en una pestaña independiente** para garantizar la plena sincronización en tiempo real.
                        </p>
                        <a
                            href={window.location.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3.5 block w-full text-center text-xs font-bold text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 underline transition hover:translate-y-[-1px]"
                        >
                            Abrir Aplicación en Nueva Pestaña 🌐
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
