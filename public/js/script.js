$(document).ready(function () {
    const URL = 'http://localhost:3000/'
    const $inputParent = $('.inputParent');
    const $inputChild = $('.inputChild');
    const $add = $('.add');
    let $delete = $('.delete');
    const $complete = $('.complete');
    const $progress = $('.progress-bar');

    let completedWorkouts = 0;
    let workoutsTotal = $complete.length;

    $(document).on('click', $delete, deleteExercise);
    $add.on('click', addExercise);
    $complete.on('change', updateProgress);
    $('#password, #confirmation').on('keyup', confirmPassword);
    $('#addFavorite, #copy, #share').on('click', handleShowForm);

    function addExercise (evt) {
        if (evt.target.tagName !== 'P') return;
        let $clone = $($inputChild.eq($inputChild.length - 1).clone());
        $clone.find('.form-control').val('');
        $clone.find('.form-select').val('');
        $clone.appendTo($inputParent);
    }

    function deleteExercise (evt) {
        if (evt.target.tagName !== 'P') return;
        $(evt.target).closest($('.inputChild')).remove();
    }

    function updateProgress (evt) {
        if ($(evt.target).is(':checked')) {
            completedWorkouts += 1;
            let percentComplete = Math.floor((completedWorkouts / workoutsTotal) * 100);
            $progress.css('width', `${percentComplete}%`);
            if (completedWorkouts === workoutsTotal) {
                completeWorkout(`${evt.target.id}`);
                $complete.off('change', updateProgress);
                $complete.attr('disabled', true);
                $('.progress').after($('<br><div>Congratulations, workout completed!</div>').addClass('center'));
            }
        } else {
            completedWorkouts -= 1;
            let percentComplete = Math.floor((completedWorkouts / workoutsTotal) * 100);
            $progress.css('width', `${percentComplete}%`);
        }
    }

    function confirmPassword () {
        if ($('#password').val().length === 0) return;
        if ($('#password').val() === $('#confirmation').val()) {
            $('#signupSubmit').removeAttr('disabled');
            $('#message').text('');
        } else {
            $('#signupSubmit').attr('disabled', true);
            if ($('#confirmation').val().length > 0) {
                $('#message').text('Passwords do not match').css('color', 'red');
            }
        }
    }

    function handleShowForm (evt) {
        evt.preventDefault();
        let $form = $(evt.target).siblings('form');
        $form.hasClass('d-none') ? $form.removeClass('d-none') : $form.addClass('d-none');
    }

    async function completeWorkout (id) {
        await fetch(URL + 'workouts/' + id + '/complete?_method=PUT', {
            method: 'POST',
            headers: {
                'Content-Type': 'Application/json',
            },
            body: JSON.stringify({
                'id': `${id}`,
                'change': 'isComplete'
            })
        });
    }
});