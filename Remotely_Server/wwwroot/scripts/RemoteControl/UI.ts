﻿import { RCBrowserSockets } from "./RCBrowserSockets.js";
import { GetDistanceBetween } from "../Utilities.js";
import { ConnectToClient, RemoteControl } from "./RemoteControl.js";
import { FloatMessage } from "../UI.js";
import { RemoteControlMode } from "../Enums/RemoteControlMode.js";

export var SessionIDInput = document.querySelector("#sessionIDInput") as HTMLInputElement;
export var ConnectButton = document.querySelector("#connectButton") as HTMLButtonElement;
export var RequesterNameInput = document.querySelector("#nameInput") as HTMLInputElement;
export var StatusMessage = document.querySelector("#statusMessage") as HTMLDivElement;
export var ScreenViewer = document.querySelector("#screenViewer") as HTMLCanvasElement;
export var Screen2DContext = ScreenViewer.getContext("2d");
export var HorizontalBars = document.querySelectorAll(".horizontal-button-bar");
export var ConnectBox = document.getElementById("connectBox") as HTMLDivElement;
export var ScreenSelectBar = document.querySelector("#screenSelectBar") as HTMLDivElement;
export var ConnectionBar = document.getElementById("connectionBar") as HTMLDivElement;
export var ActionsBar = document.getElementById("actionsBar") as HTMLDivElement;
export var OnScreenKeyboard = document.getElementById("osk") as HTMLDivElement;
export var FileTransferInput = document.getElementById("fileTransferInput") as HTMLInputElement;
export var FileTransferProgress = document.getElementById("fileTransferProgress") as HTMLProgressElement;
export var KeyboardButton = document.getElementById("keyboardButton") as HTMLButtonElement;

var lastPointerMove = Date.now();
var lastTouchPointX: number;
var lastTouchPointY: number;
var lastTouchStart = Date.now();
var touchList = new Array<number>();
var longPressTimeout: number;
var lastTouchDistanceMoved = 0;

export function ApplyInputHandlers(sockets: RCBrowserSockets) {
    document.querySelector("#menuButton").addEventListener("click", (ev) => {
        HorizontalBars.forEach(x => {
            x.classList.remove('open');
        })
        ConnectionBar.classList.toggle("open");
    })
    document.querySelector("#actionsButton").addEventListener("click", (ev) => {
        HorizontalBars.forEach(x => {
            if (x.id != "actionsBar") {
                x.classList.remove('open');
            }
        })
        ActionsBar.classList.toggle("open");
    })
    document.querySelector("#changeScreenButton").addEventListener("click", (ev) => {
        HorizontalBars.forEach(x => {
            if (x.id != "screenSelectBar") {
                x.classList.remove('open');
            }
        })
        ScreenSelectBar.classList.toggle("open");
    })
    document.querySelector("#fitToScreenButton").addEventListener("click", (ev) => {
        var button = ev.currentTarget as HTMLButtonElement;
        button.classList.toggle("toggled");
        if (button.classList.contains("toggled")) {
            ScreenViewer.style.removeProperty("max-width");
            ScreenViewer.style.removeProperty("max-height");
        }
        else {
            ScreenViewer.style.maxWidth = "unset";
            ScreenViewer.style.maxHeight = "unset";
        }
    })
    document.querySelector("#disconnectButton").addEventListener("click", (ev) => {
        ConnectButton.removeAttribute("disabled");
    });
    document.querySelector("#keyboardButton").addEventListener("click", (ev) => {
        HorizontalBars.forEach(x => {
            x.classList.remove('open');
        });
        ConnectionBar.classList.remove("open");
        OnScreenKeyboard.classList.toggle("open");
    });
    document.querySelector("#inviteButton").addEventListener("click", (ev) => {
        var url = "";
        if (RemoteControl.Mode ==  RemoteControlMode.Normal) {
            url = `${location.origin}${location.pathname}?sessionID=${RemoteControl.ClientID}`;
        }
        else {
            url = location.href;
        }
        var input = document.createElement("input");
        input.style.position = "fixed";
        input.style.top = "-1000px";
        input.type = "text";
        document.body.appendChild(input);
        input.value = url;
        input.select();
        document.execCommand("copy", false, location.href);
        input.remove();
        FloatMessage("Link copied to clipboard.");
        
    })
    document.querySelector("#fileTransferButton").addEventListener("click", (ev) => {
        FileTransferInput.click();
    });
    (document.querySelector("#fileTransferInput") as HTMLInputElement).addEventListener("change", (ev) => {
        uploadFiles(FileTransferInput.files);
    });
  
    document.querySelector("#ctrlAltDelButton").addEventListener("click", (ev) => {
        if (!RemoteControl.ServiceID) {
            ShowMessage("Not available for this session.");
            return;
        }
        HorizontalBars.forEach(x => {
            x.classList.remove('open');
        });
        ConnectionBar.classList.remove("open");
        RemoteControl.RCBrowserSockets.SendCtrlAltDel();
    });
    document.querySelector("#sessionIDInput, #nameInput").addEventListener("keypress", (ev: KeyboardEvent) => {
        if (ev.key.toLowerCase() == "enter") {
            ConnectToClient();
        }
    });
    document.querySelector("#connectButton").addEventListener("click", (ev) => {
        ConnectToClient();
    });
    ScreenViewer.addEventListener("mousemove", function (e) {
        e.preventDefault();
        if (Date.now() - lastPointerMove < 25) {
            return;
        }
        lastPointerMove = Date.now();
        var percentX = e.offsetX / ScreenViewer.clientWidth;
        var percentY = e.offsetY / ScreenViewer.clientHeight;
        //sockets.SendMouseMove(percentX, percentY);
    });
    ScreenViewer.addEventListener("mousedown", function (e) {
        if (e.button != 0 && e.button != 2) {
            return;
        }
        e.preventDefault();
        var percentX = e.offsetX / ScreenViewer.clientWidth;
        var percentY = e.offsetY / ScreenViewer.clientHeight;
        var button: string;
        if (e.button == 0) {
            button = "left";
        }
        else if (e.button == 2) {
            button = "right";
        }
        sockets.SendMouseDown(button, percentX, percentY);
    });
    ScreenViewer.addEventListener("mouseup", function (e) {
        if (e.button != 0 && e.button != 2) {
            return;
        }
        e.preventDefault();
        var percentX = e.offsetX / ScreenViewer.clientWidth;
        var percentY = e.offsetY / ScreenViewer.clientHeight;
        var button: string;
        if (e.button == 0) {
            button = "left";
        }
        else if (e.button == 2) {
            button = "right";
        }
        sockets.SendMouseUp(button, percentX, percentY);
    });
    ScreenViewer.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
    });
    ScreenViewer.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
    });
    ScreenViewer.addEventListener("touchstart", function (e) {
        KeyboardButton.removeAttribute("hidden");
        var focusedInput = document.querySelector("input:focus") as HTMLInputElement;
        if (focusedInput) {
            focusedInput.blur();
        }
        touchList.push(e.changedTouches[0].identifier);

        if (e.touches.length > 1) {
            window.clearTimeout(longPressTimeout);
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        if (Date.now() - lastTouchStart < 500) {
            sockets.SendTouchDown();
            return;
        }
        lastTouchStart = Date.now();
        lastTouchPointX = e.touches[0].clientX;
        lastTouchPointY = e.touches[0].clientY;
        lastTouchDistanceMoved = 0;
        longPressTimeout = window.setTimeout(() => {
            if (lastTouchStart > lastPointerMove && touchList.some(x => x == e.changedTouches[0].identifier)) {
                sockets.SendLongPress();
            }
        }, 1500);
    });

    ScreenViewer.addEventListener("touchmove", function (e) {
        if (e.touches.length > 1) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();

        if (Date.now() - lastPointerMove < 50) {
            return;
        }

        lastTouchDistanceMoved = GetDistanceBetween(lastTouchPointX, lastTouchPointY, e.touches[0].clientX, e.touches[0].clientY);

        var moveX = (e.touches[0].clientX - lastTouchPointX) * 2;
        var moveY = (e.touches[0].clientY - lastTouchPointY) * 2;
        sockets.SendTouchMove(moveX, moveY);
        lastTouchPointX = e.touches[0].clientX;
        lastTouchPointY = e.touches[0].clientY;
        lastPointerMove = Date.now();
    });
    ScreenViewer.addEventListener("touchend", function (e) {
        var index = touchList.findIndex(x => x == e.changedTouches[0].identifier);
        touchList.splice(index, 1);
        e.preventDefault();
        e.stopPropagation();
        if (e.touches.length > 0) {
            return;
        }
        if (Date.now() - lastTouchStart < 500 && lastTouchDistanceMoved < 5) {
            sockets.SendTap();
        }
        else {
            sockets.SendTouchUp();
        }
    });

    ScreenViewer.addEventListener("wheel", function (e) {
        e.preventDefault();
        sockets.SendMouseWheel(e.deltaX, e.deltaY);
    })
    window.addEventListener("keydown", function (e) {
        if (document.querySelector("input:focus")) {
            return;
        }
        e.preventDefault();
        sockets.SendKeyDown(e.keyCode);
    });
    window.addEventListener("keyup", function (e) {
        if (document.querySelector("input:focus")) {
            return;
        }
        e.preventDefault();
        sockets.SendKeyUp(e.keyCode);
    });

    window.ondragover = function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };
    window.ondrop = function (e) {
        e.preventDefault();
        if (e.dataTransfer.files.length < 1) {
            return;
        }
        uploadFiles(e.dataTransfer.files);
    };
}

export function ShowMessage(message: string) {
    var messageDiv = document.createElement("div");
    messageDiv.classList.add("float-message");
    messageDiv.innerHTML = message;
    document.body.appendChild(messageDiv);
    window.setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

export function Prompt(promptMessage: string): Promise<string> {
    return new Promise((resolve, reject) => {
        var modalDiv = document.createElement("div");
        modalDiv.classList.add("modal-prompt");

        var messageDiv = document.createElement("div");
        messageDiv.innerHTML = promptMessage;

        var responseInput = document.createElement("input");

        var buttonsDiv = document.createElement("div");
        buttonsDiv.classList.add("buttons-footer");

        var cancelButton = document.createElement("button");
        cancelButton.innerHTML = "Cancel";

        var okButton = document.createElement("button");
        okButton.innerHTML = "OK";

        buttonsDiv.appendChild(okButton);
        buttonsDiv.appendChild(cancelButton);
        modalDiv.appendChild(messageDiv);
        modalDiv.appendChild(responseInput);
        modalDiv.appendChild(buttonsDiv);

        document.body.appendChild(modalDiv);

        okButton.onclick = () => {
            modalDiv.remove();
            resolve(responseInput.value);
        }

        cancelButton.onclick = () => {
            modalDiv.remove();
            resolve(null);
        }
    });
}

function uploadFiles(fileList: FileList) {
    ShowMessage("File upload started...");
    FileTransferProgress.value = 0;
    FileTransferProgress.parentElement.removeAttribute("hidden");

    var strPath = "/API/FileSharing/";
    var fd = new FormData();
    for (var i = 0; i < fileList.length; i++) {
        fd.append('fileUpload' + i, fileList[i]);
    }
    var xhr = new XMLHttpRequest();
    xhr.open('POST', strPath, true);
    xhr.addEventListener("load", function () {
        FileTransferProgress.parentElement.setAttribute("hidden", "hidden");
        if (xhr.status === 200) {
            ShowMessage("File upload completed.");
            RemoteControl.RCBrowserSockets.SendSharedFileIDs(xhr.responseText);
        }
        else {
            ShowMessage("File upload failed.");
        }
    });
    xhr.addEventListener("error", () => {
        FileTransferProgress.parentElement.setAttribute("hidden", "hidden");
        ShowMessage("File upload failed.");
    });
    xhr.addEventListener("progress", function (e) {
        FileTransferProgress.value = isFinite(e.loaded / e.total) ? e.loaded / e.total : 0;
    });
    xhr.send(fd);
  
}