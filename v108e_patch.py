with open('/opt/cet-tutor/public/js/main.js', 'r', encoding='utf-8') as f:
    c = f.read()

# Add handleDiagTransPhoto function
trans_fn = '''
// \u8bca\u65ad\u6a21\u5f0f\u7ffb\u8bd1\u9875\u62cd\u7167\u4e0a\u4f20
function handleDiagTransPhoto(input) {
    var file = input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        var base64 = e.target.result;
        var pureBase64 = base64.split(',')[1];
        showToast('\U0001f4f7 \u6b63\u5728\u8bc6\u522b\u624b\u5199\u7ffb\u8bd1...');
        fetch('/api/essay/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: pureBase64, essay_type: isCET6User() ? 'cet6' : 'cet4' })
        }).then(function(r) { return r.json(); }).then(function(resp) {
            if (resp.success && resp.recognized_text) {
                var textarea = document.getElementById('translation-input');
                if (textarea) {
                    textarea.value = resp.recognized_text;
                    updateTranslationCount();
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

marker = "// \u66f4\u65b0\u7ffb\u8bd1\u5b57\u6570\u7edf\u8ba1"
idx = c.find(marker)
if idx > 0:
    c = c[:idx] + trans_fn + c[idx:]
    print("OK: Added handleDiagTransPhoto")
else:
    print("ERROR: updateTranslationCount marker not found")

with open('/opt/cet-tutor/public/js/main.js', 'w', encoding='utf-8') as f:
    f.write(c)
