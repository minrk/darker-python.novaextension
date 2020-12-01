exports.activate = function () {
  // Do work when the extension is activated
  // TODO: should we move this event watcher
  nova.workspace.onDidAddTextEditor((editor) => {
    editor.onDidSave(darkerOnSave);
  });
};

exports.deactivate = function () {
  // Clean up state before the extension is deactivated
  // how do I unregister onDidAddTextEditor
};

const MODIFIED = "MODIFIED";
const UNTRACKED = "UNTRACKED";
const UNCHANGED = "UNCHANGED";

function notify(message) {
  let request = new NotificationRequest("darker-python");
  request.title = "Darker Python";
  request.body = message;
  nova.notifications.add(request);
}

async function darkerOnSave(editor) {
  if (
    !(
      nova.config.get("darker-python.formatOnSave") ||
      nova.config.get("darker-python.formatUntrackedOnSave")
    )
  ) {
    return;
  }
  let status = await gitStatus(editor.document.path);
  let key;
  switch (status) {
    case MODIFIED:
      key = "formatOnSave";
      break;
    case UNTRACKED:
      key = "formatUntrackedOnSave";
      break;
    case UNCHANGED:
      return;
  }
  // TODO: support workspace config for on-save
  let formatOnSave = nova.config.get(`darker-python.${key}`);
  if (formatOnSave) {
    darker(editor.document.path, status);
  }
}

async function darker(path, status) {
  if (!status) {
    let status = await gitStatus(path);
  }
  let exe = nova.config.get("darker-python.executable");
  switch (status) {
    case MODIFIED:
      break;
    case UNTRACKED:
      exe = nova.path.join(nova.path.dirname(exe), "black");
      break;
    case UNCHANGED:
      return;
  }

  var options = {
    args: [exe, path],
    cwd: nova.path.dirname(path),
  };

  console.log(`Formatting ${status} file with ${exe}`);
  var process = new Process("/usr/bin/env", options);
  var lines = [];

  function collect(data) {
    if (data) {
      lines.push(data);
    }
  }
  process.onStdout(collect);
  process.onStderr(collect);

  process.onDidExit(function (status) {
    var string = `${exe} exited with status ${status}:\n` + lines.join("");
    console.log(string);
    if (status) {
      notify(string);
    }
  });

  process.start();
}

async function gitStatus(path) {
  // git status of a file
  // returns one of: UNTRACKED, MODIFIED, UNCHANGED
  var options = {
    args: ["git", "status", "--porcelain", path],
    cwd: nova.path.dirname(path),
  };
  var process = new Process("/usr/bin/env", options);
  var lines = [];

  function collect(data) {
    if (data) {
      lines.push(data);
    }
  }
  process.onStdout(collect);
  process.onStderr(collect);

  let p = new Promise((resolve) => {
    process.onDidExit(function (status) {
      const output = lines.join("").trim();
      if (status) {
        notify(`${options.args.join(" ")} exited with ${status}\n${output}`);
      }
      let result;
      if (output.length == 0) {
        result = UNCHANGED;
      } else if (output.slice(0, 2) === "??") {
        result = UNTRACKED;
      } else {
        // TODO: error handling here?
        result = MODIFIED;
      }
      resolve(result);
    });
  });
  process.start();
  return await p;
}

nova.commands.register("darker-python.darker-file", async (editor) => {
  // Begin an edit session
  await darker(editor.document.path);
});
