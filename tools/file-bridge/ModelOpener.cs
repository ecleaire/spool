using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text.RegularExpressions;
using System.Windows.Forms;
using Microsoft.Win32;

public static class ModelOpener {
    const string DownloadHost = "mtfmamufpaqpwsuiccoz.supabase.co";
    const long Limit = 104857600;
    static readonly string Home = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SPOOL", "FileBridge");
    public sealed class Request { public string Mode, Name, File; public Uri Remote; }

    public static Request Parse(string link) {
        Uri uri;
        if (link.Length > 12000 || !Uri.TryCreate(link, UriKind.Absolute, out uri) ||
            (uri.Scheme != "spool-open" && uri.Scheme != "spool-bambu") ||
            (uri.Host != "open" && uri.Host != "pick") || uri.AbsolutePath != "/" || uri.Fragment.Length != 0 || uri.UserInfo.Length != 0)
            throw new Exception("Invalid SPOOL link.");
        var values = new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
        foreach (string part in uri.Query.TrimStart('?').Split('&')) {
            int equal = part.IndexOf('=');
            if (equal < 1) throw new Exception("Invalid file parameter.");
            string key = Uri.UnescapeDataString(part.Substring(0,equal));
            if (values.ContainsKey(key)) throw new Exception("Duplicate file parameter.");
            values[key] = Uri.UnescapeDataString(part.Substring(equal+1));
        }
        var request = new Request();
        if (uri.Host == "pick" && values.Count == 1 && values.ContainsKey("name")) {
            request.Mode = "pick"; request.Name = values["name"];
        } else if (uri.Host == "open" && values.Count == 1 && values.ContainsKey("path")) {
            string file = values["path"];
            if (file.Length > 2048 || Regex.IsMatch(file,@"[\x00-\x1f""<>|?*]") ||
                !Regex.IsMatch(file,@"^(?:[A-Za-z]:[\\/]|\\\\[^\\/]+[\\/][^\\/]+[\\/])") ||
                Regex.IsMatch(file,@"^\\\\[?.]\\") || file.Substring(2).Contains(":"))
                throw new Exception("Use an absolute Windows path or a shared-folder path.");
            request.Mode = "local"; request.File = file; request.Name = Path.GetFileName(file);
        } else if (uri.Host == "open" && values.Count == 2 && values.ContainsKey("url") && values.ContainsKey("name")) {
            Uri remote;
            if (!Uri.TryCreate(values["url"], UriKind.Absolute, out remote) || remote.Scheme != "https" ||
                !remote.Host.Equals(DownloadHost,StringComparison.OrdinalIgnoreCase) || !remote.IsDefaultPort ||
                remote.UserInfo.Length != 0 || remote.Fragment.Length != 0 ||
                !Regex.IsMatch(remote.AbsolutePath,@"^/storage/v1/object/sign/spool-models/[0-9a-f-]{36}/[0-9a-f-]{36}/model$",RegexOptions.IgnoreCase))
                throw new Exception("Only signed SPOOL attachment URLs are accepted.");
            request.Mode = "download"; request.Remote = remote; request.Name = values["name"];
        } else throw new Exception("Invalid file parameters.");
        if (String.IsNullOrEmpty(request.Name) || request.Name.Length > 240 ||
            Regex.IsMatch(request.Name,@"[\x00-\x1f""<>|?*:/\\]") ||
            !Regex.IsMatch(request.Name,@"\.(stl|obj|3mf|amf|step|stp|gcode)$",RegexOptions.IgnoreCase))
            throw new Exception("Unsupported model filename.");
        return request;
    }

    static void Install() {
        if (MessageBox.Show("Install the SPOOL model opener for this Windows user?\n\nFile associations and security settings are not changed.","SPOOL setup",MessageBoxButtons.YesNo,MessageBoxIcon.Question) != DialogResult.Yes) return;
        Directory.CreateDirectory(Home);
        string target = Path.Combine(Home,"SPOOL.FileOpener.exe");
        if (!Path.GetFullPath(Application.ExecutablePath).Equals(target,StringComparison.OrdinalIgnoreCase)) File.Copy(Application.ExecutablePath,target,true);
        foreach (string scheme in new string[]{"spool-open","spool-bambu"}) {
            using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\"+scheme)) {
                key.SetValue("","URL:SPOOL model opener"); key.SetValue("URL Protocol","");
                using (RegistryKey command=key.CreateSubKey(@"shell\open\command")) command.SetValue("","\""+target+"\" \"%1\"");
            }
        }
        MessageBox.Show("Installed. In Windows, associate STL, 3MF and G-code with your preferred slicer.\n\nYou can now use the SPOOL 'Open in app' links.","SPOOL");
    }

    static void Uninstall() {
        if (MessageBox.Show("Remove SPOOL's app links?\nModel files and downloaded models will be kept.","SPOOL",MessageBoxButtons.YesNo) != DialogResult.Yes) return;
        foreach(string scheme in new string[]{"spool-open","spool-bambu"}) {
            string path=@"Software\Classes\"+scheme;
            using(RegistryKey key=Registry.CurrentUser.OpenSubKey(path+@"\shell\open\command")) {
                if(key==null || !Convert.ToString(key.GetValue("")).Contains(Path.Combine(Home,"SPOOL.FileOpener.exe")))continue;
            }
            Registry.CurrentUser.DeleteSubKeyTree(path,false);
        }
        MessageBox.Show("SPOOL app links removed. Original and downloaded model files were kept.","SPOOL");
    }

    static string Download(Request model) {
        string cache=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"SPOOL","ModelCache",Guid.NewGuid().ToString());
        Directory.CreateDirectory(cache);
        string name=Regex.IsMatch(model.Name,@"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)",RegexOptions.IgnoreCase)?"model-"+model.Name:model.Name;
        string file=Path.Combine(cache,name);
        ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
        var request=(HttpWebRequest)WebRequest.Create(model.Remote);
        request.AllowAutoRedirect=false; request.Timeout=120000; request.ReadWriteTimeout=120000;
        try {
            using(var response=(HttpWebResponse)request.GetResponse()) {
                if(response.StatusCode!=HttpStatusCode.OK || response.ContentLength>Limit)throw new Exception("Attachment could not be downloaded (100 MB maximum).");
                using(var input=response.GetResponseStream())using(var output=new FileStream(file,FileMode.CreateNew)) {
                    var buffer=new byte[65536];long total=0;int count;
                    while((count=input.Read(buffer,0,buffer.Length))>0){total+=count;if(total>Limit)throw new Exception("Attachment exceeds 100 MB.");output.Write(buffer,0,count);}
                    if(total==0)throw new Exception("Attachment is empty.");
                }
            }
        } catch { if(File.Exists(file))File.Delete(file);throw; }
        return file;
    }

    static void Open(Request model) {
        string file=model.File;
        if(model.Mode=="pick") {
            using(var picker=new OpenFileDialog()) {
                picker.Title="SPOOL - Choose the downloaded model";picker.FileName=model.Name;
                picker.Filter="3D print files|*.stl;*.obj;*.3mf;*.amf;*.step;*.stp;*.gcode";
                string downloads=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),"Downloads");
                if(Directory.Exists(downloads))picker.InitialDirectory=downloads;
                if(picker.ShowDialog()!=DialogResult.OK)return;file=picker.FileName;
                Parse("spool-open://open/?path="+Uri.EscapeDataString(file));
            }
        }
        string prompt=model.Mode=="download"?"Download this SPOOL attachment and open it in the Windows default app?":"Open this file in the Windows default app?";
        if(MessageBox.Show(prompt+"\n\n"+(model.Mode=="download"?model.Name:file),"SPOOL",MessageBoxButtons.YesNo,MessageBoxIcon.Question)!=DialogResult.Yes)return;
        if(model.Mode=="download")file=Download(model);
        if(!File.Exists(file))throw new Exception("File not found. Check the folder and network connection.");
        Process.Start(new ProcessStartInfo(file){UseShellExecute=true});
    }

    [STAThread]
    public static int Main(string[] args) {
        bool validation=args.Length==2 && args[0]=="--validate";
        if(validation){Console.SetOut(new StreamWriter(Console.OpenStandardOutput(),new System.Text.UTF8Encoding(false)){AutoFlush=true});Console.SetError(new StreamWriter(Console.OpenStandardError(),new System.Text.UTF8Encoding(false)){AutoFlush=true});}
        try {
            if(validation){var parsed=Parse(args[1]);Console.WriteLine(parsed.Mode+"|"+parsed.Name);return 0;}
            Application.EnableVisualStyles();
            if(args.Length==0 || (args.Length==1 && args[0]=="--install")){Install();return 0;}
            if(args.Length==1 && args[0]=="--uninstall"){Uninstall();return 0;}
            if(args.Length!=1)throw new Exception("Invalid arguments.");
            Open(Parse(args[0]));return 0;
        } catch(Exception error) {
            if(validation){Console.Error.WriteLine(error.Message);return 1;}
            MessageBox.Show(error.Message+"\n\nSet your preferred slicer as the Windows default app for this file type.","SPOOL - Cannot open file",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;
        }
    }
}
