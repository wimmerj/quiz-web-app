import base64
import json
import time
from typing import Optional, Tuple, Any, Dict

import requests


class GitHubStorage:
    """
    Lightweight wrapper around GitHub Contents API for JSON reads/writes.
    Uses optimistic concurrency via `sha` and small retry on 409.
    """

    def __init__(self, token: str, owner: str, repo: str, branch: str = "main", base_dir: str = "data"):
        self.token = token
        self.owner = owner
        self.repo = repo
        self.branch = branch
        self.base_dir = base_dir.strip("/")
        self.api_base = f"https://api.github.com/repos/{owner}/{repo}/contents"
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "quiz-web-app-github-storage"
        })

    def _full_path(self, path: str) -> str:
        path = path.strip("/")
        if self.base_dir:
            return f"{self.base_dir}/{path}"
        return path

    def _get_contents(self, path: str) -> Tuple[Optional[dict], Optional[str]]:
        url = f"{self.api_base}/{path}"
        params = {"ref": self.branch}
        r = self.session.get(url, params=params, timeout=20)
        if r.status_code == 200:
            data = r.json()
            return data, data.get("sha")
        elif r.status_code == 404:
            return None, None
        else:
            raise RuntimeError(f"GitHub GET {path} failed: {r.status_code} {r.text}")

    def _put_contents(self, path: str, content_b64: str, message: str, sha: Optional[str] = None) -> dict:
        url = f"{self.api_base}/{path}"
        payload = {
            "message": message,
            "content": content_b64,
            "branch": self.branch
        }
        if sha:
            payload["sha"] = sha
        r = self.session.put(url, json=payload, timeout=25)
        if r.status_code in (200, 201):
            return r.json()
        else:
            raise RuntimeError(f"GitHub PUT {path} failed: {r.status_code} {r.text}")

    def read_json(self, rel_path: str) -> Optional[Any]:
        path = self._full_path(rel_path)
        data, _ = self._get_contents(path)
        if not data:
            return None
        if isinstance(data, dict) and data.get("content"):
            raw = base64.b64decode(data["content"]).decode("utf-8")
            return json.loads(raw)
        return None

    def write_json(self, rel_path: str, payload: Any, message: str, max_retries: int = 2) -> dict:
        """
        Writes JSON file with small retry on 409 conflict.
        """
        path = self._full_path(rel_path)
        attempt = 0
        while True:
            attempt += 1
            # get current sha if exists
            current, sha = self._get_contents(path)
            content_str = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
            b64 = base64.b64encode(content_str.encode("utf-8")).decode("ascii")
            try:
                return self._put_contents(path, b64, message, sha=sha)
            except RuntimeError as e:
                msg = str(e)
                if "409" in msg and attempt <= max_retries:
                    # small backoff and retry (re-fetch sha)
                    time.sleep(0.5 * attempt)
                    continue
                raise

    def ensure_index(self, index_path: str, initial: Dict[str, Any]) -> Dict[str, Any]:
        idx = self.read_json(index_path)
        if idx is None:
            self.write_json(index_path, initial, message=f"Initialize index {index_path}")
            return initial
        return idx

    # Convenience helpers for users/progress
    def read_user_by_id(self, user_id: int) -> Optional[dict]:
        return self.read_json(f"users/{user_id}.json")

    def read_users_index(self) -> Dict[str, Any]:
        return self.ensure_index("users/_index.json", {"next_id": 1, "usernames": {}})

    def write_users_index(self, idx: Dict[str, Any]):
        self.write_json("users/_index.json", idx, message="Update users index")

    def save_user(self, user_obj: Dict[str, Any]):
        user_id = user_obj["id"]
        self.write_json(f"users/{user_id}.json", user_obj, message=f"Save user {user_id}")

    def read_progress(self, user_id: int) -> Dict[str, Any]:
        return self.read_json(f"quiz_progress/{user_id}.json") or {"entries": []}

    def write_progress(self, user_id: int, progress: Dict[str, Any]):
        self.write_json(f"quiz_progress/{user_id}.json", progress, message=f"Update progress for user {user_id}")
