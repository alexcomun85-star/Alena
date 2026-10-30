import importlib.util
s=importlib.util.spec_from_file_location('install','scripts/install_ai_meals.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
a='server { listen 80; server_name assistant.alenafit.com; }\nserver { listen 443 ssl; server_name assistant.alenafit.com; location / { proxy_pass http://127.0.0.1:18080; } }'
b=m.patch_nginx(a)
assert b.count('AFITA_AI_MEALS_V1')==1 and m.patch_nginx(b)==b
assert b.split('\n')[0]==a.split('\n')[0] and '18080' in b
try:m.patch_nginx('server { listen 443 ssl; server_name other.com; }')
except RuntimeError:pass
else:raise AssertionError('must not change unrelated server')
print('Nginx patch: HTTPS only, existing chat retained, idempotent OK')
