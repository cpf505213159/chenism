# -*- coding: utf-8 -*-
import io
p = r"content/projects/tracking-quality.mdx"
s = io.open(p, encoding="utf-8").read()
if "repoUrl:" not in s:
    assert "slug: tracking-quality\n" in s
    s = s.replace("slug: tracking-quality\n",
                  "slug: tracking-quality\nrepoUrl: https://github.com/cpf505213159/tracking-quality\n", 1)
    io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("repoUrl count:", io.open(p, encoding="utf-8").read().count("repoUrl:"))
