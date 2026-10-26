<?php
declare(strict_types=1);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => ['message' => 'Solo se permite POST.']]);
    exit;
}

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$prefix = '/api/function/';
if (!is_string($requestPath) || !str_starts_with($requestPath, $prefix)) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => ['message' => 'Ruta no encontrada.']]);
    exit;
}

$route = substr($requestPath, strlen($prefix));
$allowedRoutes = [
    'clientes/consultar',
    'inventario/consultar',
    'pedidos/consultar',
    'pedidos/crear',
    'tickets/consultar',
    'tickets/crear',
    'chat',
];
if (!in_array($route, $allowedRoutes, true)) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => ['message' => 'Operación no permitida.']]);
    exit;
}

$baseUrl = rtrim((string) getenv('AZURE_FUNCTION_BASE_URL'), '/');
$functionKey = (string) getenv('AZURE_FUNCTION_KEY');
if ($baseUrl === '' || $functionKey === '') {
    error_log('Faltan AZURE_FUNCTION_BASE_URL o AZURE_FUNCTION_KEY en el entorno del backend.');
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => ['message' => 'El backend no está configurado.']]);
    exit;
}

$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > 65536) {
    http_response_code(413);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => ['message' => 'La solicitud excede el tamaño permitido.']]);
    exit;
}

$requestBody = file_get_contents('php://input');
$decodedBody = $requestBody === false ? null : json_decode($requestBody);
if (!is_object($decodedBody)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => ['message' => 'El cuerpo debe ser un objeto JSON válido.']]);
    exit;
}

$curl = curl_init($baseUrl . '/api/' . $route);
if ($curl === false) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => ['message' => 'No fue posible iniciar la solicitud.']]);
    exit;
}

curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $requestBody,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'x-functions-key: ' . $functionKey,
    ],
]);

$responseBody = curl_exec($curl);
$curlError = curl_error($curl);
$upstreamStatus = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

if ($responseBody === false) {
    error_log('Error de conexión del BFF con Azure Functions: ' . $curlError);
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => ['message' => 'No fue posible contactar el servicio.']]);
    exit;
}

http_response_code($upstreamStatus > 0 ? $upstreamStatus : 502);
header('Content-Type: application/json; charset=utf-8');
echo $responseBody;