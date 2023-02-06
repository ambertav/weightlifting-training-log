$(document).ready(function () {
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

    function addExercise(evt) {
        if (evt.target.tagName !== 'P') return;
        let $clone = $($inputChild.eq($inputChild.length - 1).clone());
        $clone.find('.form-control').val('');
        $clone.find('.form-select').val('');
        $clone.appendTo($inputParent);
    }

    function deleteExercise(evt) {
        if (evt.target.tagName !== 'P') return;
        $(evt.target).closest($('.inputChild')).remove();
    }

    function updateProgress(evt) {
        if ($(evt.target).is(':checked')) {
            completedWorkouts += 1;
            let percentComplete = Math.floor((completedWorkouts / workoutsTotal) * 100);
            $progress.css('width', `${percentComplete}%`);
        } else {
            completedWorkouts -= 1;
            let percentComplete = Math.floor((completedWorkouts / workoutsTotal) * 100);
            $progress.css('width', `${percentComplete}%`);
        }
    }
});