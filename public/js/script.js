var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
$(function () {
    // const URL = 'https://weightlifting-log.herokuapp.com/';
    var URL = 'http://localhost:3000/';
    // password and confirmation field inputs
    var $password = $('#password');
    var $confirmation = $('#confirmation');
    // DOM elements for workouts edit and new templates in which to insert and delete exercise form inputs
    var $inputParent = $('.workoutInputParent');
    var $inputChild = $('.workoutInputChild');
    // add and delete buttons on workouts edit and new templates
    var $add = $('.add');
    var $delete = $('.delete');
    // progess bar and complete checkboxes on workout show template
    var $complete = $('.complete');
    var $progress = $('.progress-bar');
    // to access elements for movement form (new and edit) validation
    var $muscles = $('.muscleCheckbox');
    var $movementType = $('.movementTypeCheckbox');
    var $movementSubmit = $('.movementSubmit');
    // for collapsable requests and friendship lists on profile page
    var $pending = $('#pendingList');
    var $friend = $('#friendsList');
    var completedWorkouts = 0;
    var workoutsTotal = $complete.length;
    // Event Binders 
    $password.add($confirmation).on('keyup', confirmPassword);
    $inputParent.on('click', $delete, deleteExercise);
    $add.on('click', addExercise);
    $complete.on('change', updateProgress);
    $('.isPublic').on('click', togglePublic);
    $('#addFavorite, #copy, #editProfile, .movementDelete').on('click', function (evt) {
        evt.preventDefault();
        var selectors = [];
        if ($(this).is('#addFavorite'))
            selectors = [$('.favorite')];
        else if ($(this).is('#copy'))
            selectors = [$('.copy')];
        else if ($(this).is('.movementDelete')) {
            var $button = $(this);
            var $div = $($button.closest('div'));
            selectors = [$($div.find('.confirmDelete'))];
            if ($button.text() === 'Delete')
                $button.text('Cancel').toggleClass('btn-outline-dark btn-outline-warning');
            else if ($button.text() === 'Cancel')
                $button.text('Delete').toggleClass('btn-outline-warning btn-outline-dark');
        }
        else if ($(this).is('#editProfile')) {
            selectors = [$('.userBioForm'), $('.userPhoto'), $('.userBio')];
            $('html, body').animate({ scrollTop: 0 }, 100); // scrolls to top to see form
        }
        toggleForms(selectors);
    });
    $('.movementTypeCheckbox, .typeFilter').on('change', function () {
        // uses separate toggling logic due to specific condition of only showing when 'weighted' is checked
        var eventTrigger = $(this);
        var targetForm;
        if ($(this).is('.movementTypeCheckbox'))
            targetForm = $('.musclesWorked');
        else
            targetForm = $('#muscleFilter');
        toggleFormsBasedOnMovementType(eventTrigger, targetForm);
    });
    $('#profilePhoto').on('change', enableSubmit);
    $movementType.add($muscles).on('change', validateMovementForm);
    $('.movementSelect').each(handleWorkoutFormChange);
    $inputParent.on('change', '.movementSelect', handleWorkoutFormChange);
    $inputParent.on('change', enableWorkoutSubmit);
    $('#pendingCollapse, #friendsCollapse').on('click', toggleCollapse);
    // Event Handlers
    function confirmPassword() {
        var passwordVal = $password.val();
        if (passwordVal.length === 0)
            return;
        var confirmVal = $confirmation.val();
        var match = passwordVal === confirmVal;
        $('#signupSubmit').prop('disabled', !match);
        if (confirmVal.length > 0)
            $('#message').text(match ? '' : 'Passwords do not match');
    }
    // adds a new set of exercise inputs
    function addExercise(evt) {
        if (evt.target instanceof HTMLElement && evt.target.tagName !== 'P')
            return;
        var $clone = $($inputChild.eq($inputChild.length - 1).clone());
        $clone.find('.weightedSection, .cardioSection').show();
        $clone.find('.form-control').val('');
        $clone.find('.form-select').val('');
        $clone.appendTo($inputParent);
        enableWorkoutSubmit();
    }
    // deletes a specific set of exercise inputs
    function deleteExercise(evt) {
        if (evt.target instanceof HTMLElement && evt.target.tagName !== 'P')
            return;
        $(evt.target).closest($('.workoutInputChild')).remove();
    }
    // updates workout completion progress on workout show template
    function updateProgress(evt) {
        var isChecked = $(evt.target).is(':checked');
        if (isChecked)
            completedWorkouts += 1;
        else
            completedWorkouts -= 1;
        var percentComplete = Math.floor((completedWorkouts / workoutsTotal) * 100);
        $progress.css('width', "".concat(percentComplete, "%"));
        if (completedWorkouts === workoutsTotal) {
            completeWorkout("".concat((evt.target).id));
            $complete.off('change', updateProgress);
            $complete.attr('disabled', 'true');
            $('.progress').after($('<div>Congratulations, workout completed!</div>').addClass('center mt-4 fw-bold'));
        }
    }
    // toggles hidden forms for editing profile, adding favorites, and copying favorites to workouts
    function toggleForms(selectors) {
        for (var _i = 0, selectors_1 = selectors; _i < selectors_1.length; _i++) {
            var selector = selectors_1[_i];
            var $element = selector;
            $element.toggleClass('d-none');
        }
    }
    function toggleFormsBasedOnMovementType(eventTrigger, targetForm) {
        if (eventTrigger.is(':checked') && eventTrigger.val() === 'weighted')
            targetForm.removeClass('d-none');
        else
            targetForm.addClass('d-none');
    }
    // for profile photo submit button
    function enableSubmit(evt) {
        if ($(evt.target).val() !== '')
            $(evt.target).siblings().removeAttr('disabled');
    }
    // validate the type of movement, and if weighted that at least 1 muscle is selected, is selected before submitting
    function validateMovementForm() {
        var selectedMovementType = $('input[name="type"]:checked').val();
        var validateMuscle = selectedMovementType === 'weighted' ? $muscles.is(':checked') : true;
        var validateType = selectedMovementType !== undefined;
        $movementSubmit.prop('disabled', !(validateMuscle && validateType));
    }
    // determines movement type and weighted / cardio section for each set of exercise inputs
    function handleWorkoutFormChange() {
        var $exerciseSection = $(this).closest('.workoutInputChild');
        var selectedOption = $(this).find(':selected');
        var type = selectedOption.data('type');
        var $weightedSection = $exerciseSection.find('.weightedSection');
        var $cardioSection = $exerciseSection.find('.cardioSection');
        validateWorkoutForm(type, $weightedSection, $cardioSection);
    }
    // hides and shows corresponding inputs based on movement type (weighted or cardio)
    function validateWorkoutForm(type, weighted, cardio) {
        if (type === 'weighted') {
            weighted.show();
            cardio.hide();
            cardio.find('input[type="number"]').val('');
        }
        else if (type === 'cardio') {
            cardio.show();
            weighted.hide();
            weighted.find('input[type="number"]').val('');
        }
    }
    function enableWorkoutSubmit() {
        var $inputs = $('.workoutInputChild input[type="number"]:visible');
        var allFilled = $inputs.toArray().every(function (input) {
            return $(input).val().trim() !== '';
        });
        $('.workoutSubmit').prop('disabled', !allFilled);
    }
    function toggleCollapse(evt) {
        if (evt.target.id === 'pendingCollapse')
            $pending.slideToggle();
        if (evt.target.id === 'friendsCollapse')
            $friend.slideToggle();
    }
    function togglePublic(evt) {
        return __awaiter(this, void 0, void 0, function () {
            var id, button, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        id = evt.target.id;
                        button = $(evt.target);
                        return [4 /*yield*/, fetch(URL + 'favorites/' + id + '/toggle-public?_method=PUT', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'Application/json',
                                },
                                body: JSON.stringify({
                                    'id': "".concat(id),
                                })
                            })];
                    case 1:
                        response = _a.sent();
                        // toggles classes for styles if response was successful
                        if (response.ok) {
                            if (button.hasClass('btn-success'))
                                button.removeClass('btn-success').addClass('btn-danger').text('Private');
                            else
                                button.removeClass('btn-danger').addClass('btn-success').text('Public');
                        }
                        return [2 /*return*/];
                }
            });
        });
    }
    // updates workout completion status
    function completeWorkout(id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fetch(URL + 'workouts/' + id + '/complete?_method=PUT', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'Application/json',
                            },
                            body: JSON.stringify({
                                'id': "".concat(id),
                            })
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
});
