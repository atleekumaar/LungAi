"""
Compact 3D CNN model for Pulmonary Nodule Candidate Classification.
Accepts 3D CT patch tensor (B, C, D, H, W) normalized to [0, 1].
Outputs raw binary classification logits (non-nodule vs nodule).
Sigmoid is strictly reserved for converting logits to probability scores during inference.
"""
from typing import Tuple
import torch
import torch.nn as nn

class ConvBlock3D(nn.Module):
    """3D Convolution + BatchNorm3d + LeakyReLU block."""
    def __init__(self, in_channels: int, out_channels: int, kernel_size: int = 3, stride: int = 1, padding: int = 1):
        super().__init__()
        self.conv = nn.Conv3d(
            in_channels,
            out_channels,
            kernel_size=kernel_size,
            stride=stride,
            padding=padding,
            bias=False
        )
        self.bn = nn.BatchNorm3d(out_channels)
        self.act = nn.LeakyReLU(negative_slope=0.1, inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.act(self.bn(self.conv(x)))

class NoduleCandidateClassifier3D(nn.Module):
    """
    3D CNN Architecture for LUNA16 candidate patch classification.
    Input: (B, in_channels=1, D=32, H=32, W=32)
    Output: (B, 1) raw logit.
    """
    def __init__(
        self,
        in_channels: int = 1,
        base_filters: int = 16,
        patch_size: Tuple[int, int, int] = (32, 32, 32),
        dropout_rate: float = 0.3
    ):
        super().__init__()
        self.in_channels = in_channels
        self.base_filters = base_filters
        self.patch_size = patch_size

        # Stage 1: 32x32x32 -> 16x16x16
        self.stage1 = nn.Sequential(
            ConvBlock3D(in_channels, base_filters),
            ConvBlock3D(base_filters, base_filters),
            nn.MaxPool3d(kernel_size=2, stride=2)
        )

        # Stage 2: 16x16x16 -> 8x8x8
        self.stage2 = nn.Sequential(
            ConvBlock3D(base_filters, base_filters * 2),
            ConvBlock3D(base_filters * 2, base_filters * 2),
            nn.MaxPool3d(kernel_size=2, stride=2)
        )

        # Stage 3: 8x8x8 -> 4x4x4
        self.stage3 = nn.Sequential(
            ConvBlock3D(base_filters * 2, base_filters * 4),
            ConvBlock3D(base_filters * 4, base_filters * 4),
            nn.MaxPool3d(kernel_size=2, stride=2)
        )

        # Global spatial pooling to support configurable patch dimensions robustly
        self.global_pool = nn.AdaptiveAvgPool3d((1, 1, 1))

        # Classifier head
        self.head = nn.Sequential(
            nn.Flatten(),
            nn.Linear(base_filters * 4, base_filters * 2),
            nn.LeakyReLU(negative_slope=0.1, inplace=True),
            nn.Dropout(p=dropout_rate),
            nn.Linear(base_filters * 2, 1) # Raw logit output
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass returning raw logits (B, 1).
        """
        if x.dim() != 5:
            raise ValueError(f"Expected 5D tensor (B, C, D, H, W), got {x.dim()}D tensor with shape {tuple(x.shape)}")
        if x.size(1) != self.in_channels:
            raise ValueError(f"Expected {self.in_channels} channel(s), got {x.size(1)}")

        feat1 = self.stage1(x)
        feat2 = self.stage2(feat1)
        feat3 = self.stage3(feat2)
        pooled = self.global_pool(feat3)
        logits = self.head(pooled)
        return logits

    @torch.no_grad()
    def predict_score(self, x: torch.Tensor) -> torch.Tensor:
        """
        Inference method strictly converting raw logits to sigmoid candidate probabilities.
        """
        self.eval()
        logits = self.forward(x)
        return torch.sigmoid(logits)
