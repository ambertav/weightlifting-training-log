$(document).ready(function () {
    const URL = 'http://localhost:3000/'

    // password and confirmation field inputs
    const $password = $('#password');
    const $confirmation = $('#confirmation');

    // DOM elements for workouts edit and new templates in which to insert and delete exercise form inputs
    const $inputParent = $('.workoutInputParent');
    const $inputChild = $('.workoutInputChild');

    // add and delete buttons on workouts edit and new templates
    const $add = $('.add');
    let $delete = $('.delete');

    // progess bar and complete checkboxes on workout show template
    const $complete = $('.complete');
    const $progress = $('.progress-bar');

    let completedWorkouts = 0;
    let workoutsTotal = $complete.length;



    // Event Binders 
    $password.add($confirmation).on('keyup', confirmPassword);
    $inputParent.on('click', $delete, deleteExercise);
    $add.on('click', addExercise);
    $complete.on('change', updateProgress);
    $('#addFavorite, #copy, #share, #editProfile').on('click', function (evt) {
        evt.preventDefault();

        let selectors;

        if ($(this).is('#addFavorite')) selectors = ['.favorite'];
        else if ($(this).is('#copy')) selectors = ['.copy'];
        else if ($(this).is('#share')) selectors = ['.share'];
        else if ($(this).is('#editProfile')) selectors = [$('.userBioForm'), $('.userPhoto'), $('.userBio')];

        toggleForms(selectors);
    });

    // $('#addFavorite, #copy, #share').on('click', handleShowForm);
    // $('#editProfile').on('click', handleProfileForm);
    $('#profilePhoto').on('change', enableSubmit);


    // Event Handlers
    function confirmPassword() {
        const passwordVal = $password.val()
        if (passwordVal.length === 0) return;
        const confirmVal = $confirmation.val()

        const match = passwordVal === confirmVal;

        $('#signupSubmit').prop('disabled', !match);
        if (confirmVal.length > 0) $('#message').text(match ? '' : 'Passwords do not match');
    }

    function addExercise(evt) {
        if (evt.target.tagName !== 'P') return;
        let $clone = $($inputChild.eq($inputChild.length - 1).clone());
        $clone.find('.form-control').val('');
        $clone.find('.form-select').val('');
        $clone.appendTo($inputParent);
    }

    function deleteExercise(evt) {
        if (evt.target.tagName !== 'P') return;
        $(evt.target).closest($('.workoutInputChild')).remove();
    }

    // updates workout completion progress on workout show template
    function updateProgress(evt) {
        const isChecked = $(evt.target).is(':checked');

        if (isChecked) completedWorkouts += 1;
        else completedWorkouts -= 1;

        const percentComplete = Math.floor((completedWorkouts / workoutsTotal) * 100);
        $progress.css('width', `${percentComplete}%`);

        if (completedWorkouts === workoutsTotal) {
            completeWorkout(`${evt.target.id}`);
            $complete.off('change', updateProgress);
            $complete.attr('disabled', true);
            $('.progress').after($('<div>Congratulations, workout completed!</div>').addClass('center mt-4 fw-bold'));
        }
    }

    // toggles hidden forms for editing profile, adding favorites, sharing favorites and copying favorites to workouts
    function toggleForms (selectors) {
        for (const selector of selectors) {
            const $element = $(selector);
            $element.hasClass('d-none') ? $element.removeClass('d-none') : $element.addClass('d-none');
        }
    }

    // for profile photo submit button
    function enableSubmit(evt) {
        if ($(evt.target).val() !== '') {
            $(evt.target).siblings().removeAttr('disabled');
        }
    }

    // updates workout completion status
    async function completeWorkout(id) {
        await fetch(URL + 'workouts/' + id + '/complete?_method=PUT', {
            method: 'POST',
            headers: {
                'Content-Type': 'Application/json',
            },
            body: JSON.stringify({
                'id': `${id}`,
            })
        });
    }
});