with open('/opt/cet-tutor/public/js/main.js', 'r', encoding='utf-8') as f:
    c = f.read()

changes = []

# 1. Add camera button to writing textarea
old1 = '<textarea class="diag-writing-textarea" id="writing-input" placeholder="\u8bf7\u5728\u8fd9\u91cc\u8f93\u5165\u4f60\u7684\u4f5c\u6587..." oninput="updateWritingCount()"></textarea>'
new1 = '<div style="position:relative;"><textarea class="diag-writing-textarea" id="writing-input" placeholder="\u8bf7\u5728\u8fd9\u91cc\u8f93\u5165\u4f60\u7684\u4f5c\u6587..." oninput="updateWritingCount()"></textarea><label for="diag-writing-camera" style="position:absolute;bottom:12px;right:12px;cursor:pointer;opacity:0.5;font-size:20px;" title="\u62cd\u7167\u4e0a\u4f20\u624b\u5199\u4f5c\u6587">\U0001f4f7</label><input type="file" id="diag-writing-camera" accept="image/*" style="display:none" onchange="handleDiagWritingPhoto(this)" /></div>'

if old1 in c:
    c = c.replace(old1, new1, 1)
    changes.append("camera button on writing textarea")
else:
    print("ERROR: writing textarea not found")

# 2. Add handleDiagWritingPhoto function before updateWritingCount
photo_fn = '''
// \u8bca\u65ad\u6a21\u5f0f\u5199\u4f5c\u9875\u62cd\u7167\u4e0a\u4f20
function handleDiagWritingPhoto(input) {
    var file = input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        var base64 = e.target.result;
        var pureBase64 = base64.split(',')[1];
        showToast('\U0001f4f7 \u6b63\u5728\u8bc6\u522b\u624b\u5199\u4f5c\u6587...');
        fetch('/api/essay/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: pureBase64, essay_type: isCET6User() ? 'cet6' : 'cet4' })
        }).then(function(r) { return r.json(); }).then(function(resp) {
            if (resp.success && resp.recognized_text) {
                var textarea = document.getElementById('writing-input');
                if (textarea) {
                    textarea.value = resp.recognized_text;
                    updateWritingCount();
                    showToast('\u2705 \u8bc6\u522b\u6210\u529f\uff0c\u5df2\u586b\u5165\u6587\u672c\u6846');
                }
            } else {
                showToast('\U0001f4f7 ' + (resp.error || '\u8bc6\u522b\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u8f93\u5165'));
            }
        }).catch(function(err) {
            showToast('\U0001f4f7 \u4e0a\u4f20\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u8f93\u5165');
        });
    };
    reader.readAsDataURL(file);
    input.value = '';
}

'''

marker = "// \u66f4\u65b0\u5199\u4f5c\u5b57\u6570\u7edf\u8ba1\nfunction updateWritingCount()"
idx = c.find(marker)
if idx > 0:
    c = c[:idx] + photo_fn + c[idx:]
    changes.append("handleDiagWritingPhoto function")
else:
    print("ERROR: updateWritingCount marker not found")

with open('/opt/cet-tutor/public/js/main.js', 'w', encoding='utf-8') as f:
    f.write(c)

print("Changes:", changes)
