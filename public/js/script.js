$(document).ready(function () {
    // const URL = 'https://weightlifting-log.herokuapp.com/';
    const URL = 'http://localhost:3000/';

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

    // to access elements for movement form (new and edit) validation
    const $muscles = $('.muscleCheckbox');
    const $movementType = $('.movementTypeCheckbox');
    const $movementSubmit = $('.movementSubmit');

    // for collapsable requests and friendship lists on profile page
    const $pending = $('#pendingList');
    const $friend = $('#friendsList');

    let completedWorkouts = 0;
    let workoutsTotal = $complete.length;



    // Event Binders 
    $password.add($confirmation).on('keyup', confirmPassword);
    $inputParent.on('click', $delete, deleteExercise);
    $add.on('click', addExercise);
    $complete.on('change', updateProgress);
    $('.isPublic').on('click', togglePublic);
    $('#addFavorite, #copy, #editProfile, .movementDelete').on('click', function (evt) {
        evt.preventDefault();
        let selectors;

        if ($(this).is('#addFavorite')) selectors = ['.favorite'];
        else if ($(this).is('#copy')) selectors = ['.copy'];
        else if ($(this).is('.movementDelete')) { 
            const $button = $(this);
            $div = $($button.closest('div'));
            selectors = [$($div.find('.confirmDelete'))];
            if ($button.text() === 'Delete') $button.text('Cancel').toggleClass('btn-outline-dark btn-outline-warning');
            else if ($button.text() === 'Cancel') $button.text('Delete').toggleClass('btn-outline-warning btn-outline-dark');
        }
        else if ($(this).is('#editProfile')) {
            selectors = [$('.userBioForm'), $('.userPhoto'), $('.userBio')];
            $('html, body').animate({ scrollTop: 0 }, 100); // scrolls to top to see form
        }
        toggleForms(selectors);
    });
    $('.movementTypeCheckbox').on('change', function () {
        // uses separate toggling logic due to specific condition of only showing when 'weighted' is checked
        if ($(this).is(':checked') && $(this).val() === 'weighted')
            $('.musclesWorked').removeClass('d-none');
        else $('.musclesWorked').addClass('d-none');
    });
    $('#profilePhoto').on('change', enableSubmit);
    $movementType.add($muscles).on('change', validateMovementForm);
    $('.movementSelect').each(handleWorkoutFormChange);
    $inputParent.on('change', '.movementSelect', handleWorkoutFormChange);
    $inputParent.on('change', enableWorkoutSubmit);
    $('#pendingCollapse, #friendsCollapse').on('click', toggleCollapse);


    // Event Handlers
    function confirmPassword() {
        const passwordVal = $password.val()
        if (passwordVal.length === 0) return;
        const confirmVal = $confirmation.val()

        const match = passwordVal === confirmVal;

        $('#signupSubmit').prop('disabled', !match);
        if (confirmVal.length > 0) $('#message').text(match ? '' : 'Passwords do not match');
    }

    // adds a new set of exercise inputs
    function addExercise(evt) {
        if (evt.target.tagName !== 'P') return;
        let $clone = $($inputChild.eq($inputChild.length - 1).clone());
        $clone.find('.weightedSection, .cardioSection').show();
        $clone.find('.form-control').val('');
        $clone.find('.form-select').val('');
        $clone.appendTo($inputParent);
        enableWorkoutSubmit();
    }

    // deletes a specific set of exercise inputs
    function deleteExercise(evt) {
        if (evt.target.tagName !== 'P') return;
        $(evt.target).closest($('.workoutInputChild')).remove();
    }

    // updates workout completion progress on workout show template
    function updateProgress (evt) {
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

    // toggles hidden forms for editing profile, adding favorites, and copying favorites to workouts
    function toggleForms (selectors) {
        for (const selector of selectors) {
            const $element = $(selector);
            $element.toggleClass('d-none');
        }
    }

    // for profile photo submit button
    function enableSubmit (evt) {
        if ($(evt.target).val() !== '') $(evt.target).siblings().removeAttr('disabled');
    }

    // validate that at least 1 muscle is selected, and the type of movement is determined before submitting
    function validateMovementForm () {
        const selectedMovementType = $('input[name="type"]:checked').val();
        
        const validateMuscle = selectedMovementType === 'weighted' ? $muscles.is(':checked') : true;
        const validateType = selectedMovementType !== undefined;
        $movementSubmit.prop('disabled', !(validateMuscle && validateType));
    }

    // determines movement type and weighted / cardio section for each set of exercise inputs
    function handleWorkoutFormChange () {
        const $exerciseSection = $(this).closest('.workoutInputChild');
        const selectedOption = $(this).find(':selected');
        const type = selectedOption.data('type');

        const $weightedSection = $exerciseSection.find('.weightedSection');
        const $cardioSection = $exerciseSection.find('.cardioSection');

        validateWorkoutForm(type, $weightedSection, $cardioSection);
    }

    // hides and shows corresponding inputs based on movement type (weighted or cardio)
    function validateWorkoutForm (type, weighted, cardio) {
        if (type === 'weighted') {
            weighted.show();
            cardio.hide();
            cardio.find('input[type="number"]').val('');
        } else if (type === 'cardio') {
            cardio.show();
            weighted.hide();
            weighted.find('input[type="number"]').val('');
        }
    }

    function enableWorkoutSubmit () {
        const $inputs = $('.workoutInputChild input[type="number"]:visible');
        const allFilled = $inputs.toArray().every(function (input) {
            return $(input).val().trim() !== '';
        });
        $('.workoutSubmit').prop('disabled', !allFilled);
    }

    function toggleCollapse (evt) {
        if (evt.target.id === 'pendingCollapse') $pending.slideToggle();
        if (evt.target.id === 'friendsCollapse') $friend.slideToggle();
    }

    async function togglePublic (evt) {
        id = evt.target.id;
        const button = $(evt.target);

        const response = await fetch(URL + 'favorites/' + id + '/toggle-public?_method=PUT', {
            method: 'POST',
            headers: {
                'Content-Type': 'Application/json',
            },
            body: JSON.stringify({
                'id': `${id}`,
            })
        });

        // toggles classes for styles if response was successful
        if (response.ok) {
            if (button.hasClass('btn-success'))
                button.removeClass('btn-success').addClass('btn-danger').text('Private');
            else 
                button.removeClass('btn-danger').addClass('btn-success').text('Public');
        }
    }

    // updates workout completion status
    async function completeWorkout (id) {
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