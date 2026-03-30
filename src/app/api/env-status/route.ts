export async function GET() {
  return Response.json(
    { error: 'Endpoint deshabilitado por seguridad' },
    { status: 403 }
  );
}
