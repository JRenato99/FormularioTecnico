fetch('https://qaoqjomrlswfageitpdq.supabase.co/functions/v1/verify-captcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: 'dummy' })
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
