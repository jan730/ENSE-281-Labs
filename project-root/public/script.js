$(document).ready(() => {

    // -------------------------
    // MODEL
    // -------------------------

    let currentUser = "User A";

    const users = ["User A", "User B", "User C"];

    let notes = [
        { text: "I like apples", author: "User A", upvotes: ["User B"], downvotes: [] },
        { text: "I hate oranges", author: "User B", upvotes: [], downvotes: ["User A"] },
        { text: "I am neutral to peaches", author: "User C", upvotes: [], downvotes: [] }
    ];

    // -------------------------
    // VIEW
    // -------------------------

    function renderNotes() {
        $("#notesContainer").empty();

        notes.forEach((note, index) => {
            const score = note.upvotes.length - note.downvotes.length;
            const isAuthor = note.author === currentUser;
            const upvoted = note.upvotes.includes(currentUser);
            const downvoted = note.downvotes.includes(currentUser);
            const hasVoted = upvoted || downvoted;

            const row = $("<div>").addClass("d-flex justify-content-between align-items-center my-2");

            const text = $("<span>").text(note.text);

            const controls = $("<div>").addClass("d-flex align-items-center gap-2");

            if (isAuthor) {
                controls.append($("<span>").text(score));
            } else {
                const upBtn = $("<button>")
                    .addClass("btn btn-sm")
                    .html("&#9650;")
                    .css("color", upvoted ? "green" : "black")
                    .click(() => voteUp(index));

                const downBtn = $("<button>")
                    .addClass("btn btn-sm")
                    .html("&#9660;")
                    .css("color", downvoted ? "red" : "black")
                    .click(() => voteDown(index));

                controls.append(upBtn, downBtn);

                if (hasVoted) {
                    controls.append($("<span>").text(score));
                }
            }

            row.append(text, controls);
            $("#notesContainer").append(row);
        });
    }

    // -------------------------
    // CONTROLLER
    // -------------------------

    function voteUp(i) {
        const note = notes[i];

        note.downvotes = note.downvotes.filter(u => u !== currentUser);

        if (note.upvotes.includes(currentUser)) {
            note.upvotes = note.upvotes.filter(u => u !== currentUser);
        } else {
            note.upvotes.push(currentUser);
        }

        renderNotes();
    }

    function voteDown(i) {
        const note = notes[i];

        note.upvotes = note.upvotes.filter(u => u !== currentUser);

        if (note.downvotes.includes(currentUser)) {
            note.downvotes = note.downvotes.filter(u => u !== currentUser);
        } else {
            note.downvotes.push(currentUser);
        }

        renderNotes();
    }

    function addNote() {
        const text = $("#newNoteText").val().trim();
        if (text === "") return;

        notes.push({
            text,
            author: currentUser,
            upvotes: [],
            downvotes: []
        });

        $("#newNoteText").val("");
        renderNotes();
    }

    function switchUser(user) {
        currentUser = user;
        $("#currentUserLabel").text(`Logged in as ${currentUser}`);
        renderNotes();
    }

    // -------------------------
    // EVENT REGISTRATION
    // -------------------------

    $("#addNoteBtn").click(addNote);

    $(".user-option").click(function () {
        switchUser($(this).data("user"));
    });

    renderNotes();
});