$(document).ready(function () {
    const $inputParent = $('.inputParent');
    const $inputChild = $('.inputChild');
    const $add = $('.add');
    let $delete = $('.delete');

    $(document).on('click', $delete, deleteExercise);
    $add.on('click', addExercise);

    function addExercise(evt) {
        if (evt.target.tagName !== 'P') return;
        let $clone = $($inputChild.eq($inputChild.length - 1).clone());
        $clone.find('.form-control').val('');
        $clone.find('.form-select').val('');
        $clone.appendTo($inputParent);
    }

    function deleteExercise(evt) {
        if (evt.target.tagName !== 'P') return;
        console.log('hi');
        $(evt.target).closest($('.inputChild')).remove();
    }
});