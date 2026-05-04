using System.Diagnostics;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;

var appName = "쿨라워 꽃잡기";
var port = FindAvailablePort(5174);
var baseUrl = $"http://127.0.0.1:{port}/";
var appRoot = ExtractAppDist();

using var server = new StaticFileServer(appRoot, port);
server.Start();

Console.Title = appName;
Console.OutputEncoding = Encoding.UTF8;
Console.WriteLine($"{appName} 실행 중");
Console.WriteLine($"브라우저 주소: {baseUrl}");
Console.WriteLine("이 창을 닫으면 게임 서버도 종료됩니다.");
Console.WriteLine();

if (args.Contains("--smoke-test", StringComparer.OrdinalIgnoreCase))
{
    using var http = new HttpClient();
    var html = await http.GetStringAsync(baseUrl);
    Console.WriteLine(html.Contains("<div id=\"root\"></div>", StringComparison.Ordinal)
        ? "SMOKE_OK"
        : "SMOKE_FAIL");
    return;
}

OpenBrowser(baseUrl);

using var exitEvent = new ManualResetEventSlim(false);
Console.CancelKeyPress += (_, eventArgs) =>
{
    eventArgs.Cancel = true;
    exitEvent.Set();
};

exitEvent.Wait();

static string ExtractAppDist()
{
    var targetRoot = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "CoolFlowerCatcher",
        "embedded-dist");

    if (Directory.Exists(targetRoot))
    {
        Directory.Delete(targetRoot, recursive: true);
    }

    Directory.CreateDirectory(targetRoot);

    using var resource = Assembly.GetExecutingAssembly().GetManifestResourceStream("app-dist.zip")
        ?? throw new InvalidOperationException("내장된 앱 파일을 찾을 수 없습니다.");
    using var archive = new ZipArchive(resource, ZipArchiveMode.Read);
    archive.ExtractToDirectory(targetRoot);

    return targetRoot;
}

static int FindAvailablePort(int preferredPort)
{
    for (var port = preferredPort; port < preferredPort + 100; port++)
    {
        try
        {
            using var listener = new TcpListener(IPAddress.Loopback, port);
            listener.Start();
            return port;
        }
        catch (SocketException)
        {
            continue;
        }
    }

    throw new InvalidOperationException("사용 가능한 로컬 포트를 찾지 못했습니다.");
}

static void OpenBrowser(string url)
{
    try
    {
        Process.Start(new ProcessStartInfo(url)
        {
            UseShellExecute = true,
        });
    }
    catch (Exception error)
    {
        Console.WriteLine($"브라우저를 자동으로 열지 못했습니다: {error.Message}");
    }
}

sealed class StaticFileServer : IDisposable
{
    private readonly string _root;
    private readonly int _port;
    private readonly CancellationTokenSource _cancellation = new();
    private TcpListener? _listener;

    public StaticFileServer(string root, int port)
    {
        _root = root;
        _port = port;
    }

    public void Start()
    {
        _listener = new TcpListener(IPAddress.Loopback, _port);
        _listener.Start();
        _ = Task.Run(AcceptLoopAsync);
    }

    private async Task AcceptLoopAsync()
    {
        if (_listener is null)
        {
            return;
        }

        while (!_cancellation.IsCancellationRequested)
        {
            try
            {
                var client = await _listener.AcceptTcpClientAsync(_cancellation.Token);
                _ = Task.Run(() => HandleClientAsync(client));
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task HandleClientAsync(TcpClient client)
    {
        using var clientScope = client;
        await using var stream = client.GetStream();
        using var reader = new StreamReader(stream, Encoding.ASCII, leaveOpen: true);

        var requestLine = await reader.ReadLineAsync();
        if (string.IsNullOrWhiteSpace(requestLine))
        {
            return;
        }

        while (!string.IsNullOrEmpty(await reader.ReadLineAsync()))
        {
        }

        var parts = requestLine.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var path = parts.Length >= 2 ? parts[1] : "/";
        await WriteResponseAsync(stream, path);
    }

    private async Task WriteResponseAsync(NetworkStream stream, string requestPath)
    {
        var cleanPath = requestPath.Split('?', '#')[0];
        cleanPath = Uri.UnescapeDataString(cleanPath).Replace('/', Path.DirectorySeparatorChar);
        cleanPath = cleanPath.TrimStart(Path.DirectorySeparatorChar);

        if (string.IsNullOrWhiteSpace(cleanPath))
        {
            cleanPath = "index.html";
        }

        var filePath = Path.GetFullPath(Path.Combine(_root, cleanPath));
        if (!filePath.StartsWith(Path.GetFullPath(_root), StringComparison.OrdinalIgnoreCase) ||
            !File.Exists(filePath))
        {
            filePath = Path.Combine(_root, "index.html");
        }

        var body = await File.ReadAllBytesAsync(filePath);
        var header =
            "HTTP/1.1 200 OK\r\n" +
            $"Content-Type: {GetContentType(filePath)}\r\n" +
            $"Content-Length: {body.Length}\r\n" +
            "Cache-Control: no-store\r\n" +
            "Connection: close\r\n" +
            "\r\n";

        var headerBytes = Encoding.ASCII.GetBytes(header);
        await stream.WriteAsync(headerBytes);
        await stream.WriteAsync(body);
    }

    private static string GetContentType(string filePath)
    {
        return Path.GetExtension(filePath).ToLowerInvariant() switch
        {
            ".html" => "text/html; charset=utf-8",
            ".js" => "text/javascript; charset=utf-8",
            ".css" => "text/css; charset=utf-8",
            ".json" => "application/json; charset=utf-8",
            ".svg" => "image/svg+xml",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            ".wasm" => "application/wasm",
            _ => "application/octet-stream",
        };
    }

    public void Dispose()
    {
        _cancellation.Cancel();
        _listener?.Stop();
        _cancellation.Dispose();
    }
}
