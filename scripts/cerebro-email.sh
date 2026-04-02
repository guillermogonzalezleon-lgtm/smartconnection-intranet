#!/bin/bash
# Cerebro Email — Genera HTML desde API y envía por Gmail via AppleScript
# Uso: bash scripts/cerebro-email.sh [email]

EMAIL="${1:-guillermo.gonzalez@smconnection.cl}"
API_URL="http://localhost:3000/api/cerebro/email"
SUBJECT="🧠 Cerebro — Reporte de Evolución $(date '+%d/%m/%Y')"

echo "📧 Generando email desde Cerebro..."

# Si la app está corriendo localmente, usar localhost
# Si no, usar la URL de producción
if curl -s --max-time 3 "http://localhost:3000" > /dev/null 2>&1; then
  API_URL="http://localhost:3000/api/cerebro/email"
else
  API_URL="https://intranet.smconnection.cl/api/cerebro/email"
fi

# Fetch HTML
HTML=$(curl -s "$API_URL")

if [ -z "$HTML" ] || echo "$HTML" | grep -q '"error"'; then
  echo "❌ Error al generar email: $HTML"
  exit 1
fi

echo "✅ HTML generado ($(echo "$HTML" | wc -c | tr -d ' ') bytes)"

# Escape HTML for AppleScript
ESCAPED_HTML=$(echo "$HTML" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | tr '\n' ' ' | sed 's/  */ /g')

# Send via Gmail using AppleScript + Chrome JS
osascript <<APPLESCRIPT
tell application "Google Chrome"
  activate
  open location "https://mail.google.com/mail/?view=cm&to=${EMAIL}&su=${SUBJECT}"
  delay 4

  tell active tab of front window
    execute javascript "
      // Wait for compose window
      function waitAndInject() {
        const body = document.querySelector('div[aria-label=\"Cuerpo del mensaje\"]') || document.querySelector('div[aria-label=\"Message Body\"]') || document.querySelector('div.Am.Al.editable');
        if (body) {
          body.innerHTML = \`${ESCAPED_HTML}\`;
          return true;
        }
        return false;
      }

      if (!waitAndInject()) {
        setTimeout(waitAndInject, 2000);
      }
    "
  end tell
end tell
APPLESCRIPT

echo "📧 Gmail abierto con el email. Revisa y dale Send."
