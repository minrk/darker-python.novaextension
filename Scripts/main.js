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

async function run(options) {
  // run a process, capturing output and return status code
  // as {status, output}
  var process = new Process("/usr/bin/env", options);
  var lines = [];

  function collect(data) {
    if (data) {
      lines.push(data);
    }
  }
  process.onStdout(collect);
  process.onStderr(collect);

  // console.log(`Running ${options.args.join(" ")}`);
  let p = new Promise((resolve) => {
    process.onDidExit(function (status) {
      resolve({
        status: status,
        output: lines.join(""),
      });
    });
  });
  process.start();
  return await p;
}

async function gitStatus(path) {
  // git status of a file
  // returns one of: UNTRACKED, MODIFIED, UNCHANGED
  var options = {
    args: ["git", "status", "--porcelain", path],
    cwd: nova.path.dirname(path),
  };
  var r = await run(options);

  if (r.status) {
    // git status returns an error code if not a repo
    // check for specific errors?
    // notify(`${options.args.join(" ")} exited with ${status}\n${output}`);
    return UNTRACKED;
  } else if (r.output.slice(0, 2) === "??") {
    // in a repo, but untracked gives `?? /path`
    return UNTRACKED;
  } else if (r.output.length == 0) {
    // no output means no changes
    return UNCHANGED;
  } else {
    // typically `M /path`, maybe others?
    // TODO: check for M?
    return MODIFIED;
  }
}

async function darker(path, status) {
  if (!status) {
    // status may have been called earlier, e.g. in darkerOnSave
    // avoid calling it twice if we don't need to
    status = await gitStatus(path);
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
    default:
      throw new Error(`Invalid git status: ${status}`);
  }
  await format(exe, path);
}

async function black(path) {
  let darker = nova.config.get("darker-python.executable");
  let black = nova.path.join(nova.path.dirname(darker), "black");
  return await format(black, path);
}

async function format(exe, path) {
  var options = {
    args: [exe, path],
    cwd: nova.path.dirname(path),
  };

  console.log(`Formatting ${path} with ${exe}`);
  let result = await run(options);
  let message = `${exe} exited with status ${result.status}:\n${result.output}`;
  console.log(message);
  if (result.status) {
    notify(result.output);
  }
}

async function darkerOnSave(editor) {
  if (editor.document.syntax !== "python") {
    return;
  }
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

nova.commands.register("darker-python.darker-file", async (editor) => {
  // Format with darker (fallback on black)
  try {
    await darker(editor.document.path);
  } catch (e) {
    console.error(e);
  }
});

nova.commands.register("darker-python.black-file", async (editor) => {
  // format with black
  try {
    await black(editor.document.path);
  } catch (e) {
    console.error(e);
  }
});
