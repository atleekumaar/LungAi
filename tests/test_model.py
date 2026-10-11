"""
PyTorch 3D CNN model architecture tests:
- Tensor dimensions and channel checking
- Forward pass and logit range
- Sigmoid inference activation
- Backward pass and gradient propagation
- Missing / invalid tensor shapes
- Checkpoint serialization and round-trip
"""
import pytest
import os
import tempfile
import torch

from ml.models.classifier3d import NoduleCandidateClassifier3D

def test_model_forward_pass_dimensions():
    model = NoduleCandidateClassifier3D(in_channels=1, base_filters=8, patch_size=(32, 32, 32))
    model.eval()

    # Batch of 2 patches (B=2, C=1, D=32, H=32, W=32)
    dummy_input = torch.randn(2, 1, 32, 32, 32)
    logits = model(dummy_input)

    assert logits.shape == (2, 1)
    assert not torch.isnan(logits).any()

def test_model_predict_score_range():
    model = NoduleCandidateClassifier3D(in_channels=1, base_filters=8, patch_size=(32, 32, 32))
    dummy_input = torch.randn(3, 1, 32, 32, 32)

    scores = model.predict_score(dummy_input)
    assert scores.shape == (3, 1)
    assert (scores >= 0.0).all() and (scores <= 1.0).all()

def test_invalid_input_dimensions():
    model = NoduleCandidateClassifier3D(in_channels=1, base_filters=8)

    # 4D tensor instead of 5D
    with pytest.raises(ValueError):
        model(torch.randn(2, 1, 32, 32))

    # Incorrect channels (2 channels instead of 1)
    with pytest.raises(ValueError):
        model(torch.randn(2, 2, 32, 32, 32))

def test_model_backward_gradient_flow():
    model = NoduleCandidateClassifier3D(in_channels=1, base_filters=8)
    model.train()

    optimizer = torch.optim.SGD(model.parameters(), lr=0.01)
    criterion = torch.nn.BCEWithLogitsLoss()

    inputs = torch.randn(2, 1, 32, 32, 32)
    targets = torch.tensor([[1.0], [0.0]])

    optimizer.zero_grad()
    logits = model(inputs)
    loss = criterion(logits, targets)
    loss.backward()

    # Verify gradients computed for parameters
    for name, param in model.named_parameters():
        if param.requires_grad:
            assert param.grad is not None, f"Gradient was None for {name}"

def test_checkpoint_save_and_load():
    model = NoduleCandidateClassifier3D(in_channels=1, base_filters=8, patch_size=(32, 32, 32))
    model.eval()

    inputs = torch.randn(1, 1, 32, 32, 32)
    original_score = model.predict_score(inputs)

    with tempfile.TemporaryDirectory() as tmpdir:
        ckpt_path = os.path.join(tmpdir, "model_test.pt")
        torch.save({
            "model_state_dict": model.state_dict(),
            "base_filters": 8,
            "patch_size": (32, 32, 32)
        }, ckpt_path)

        loaded_ckpt = torch.load(ckpt_path, weights_only=False)
        new_model = NoduleCandidateClassifier3D(in_channels=1, base_filters=8, patch_size=(32, 32, 32))
        new_model.load_state_dict(loaded_ckpt["model_state_dict"])
        new_model.eval()

        new_score = new_model.predict_score(inputs)
        torch.testing.assert_close(original_score, new_score)
