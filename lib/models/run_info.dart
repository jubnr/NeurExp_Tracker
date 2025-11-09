// lib/models/run_info.dart
class RunInfo {
  final String runId; // "Run 1", "Run 2", ...
  String notes;
  String participantResponse;
  String participantImpressionEmoji;
  String? imageUrl; // chemin local vers la photo
  String? problematicChannels;

  RunInfo({
    required this.runId,
    this.notes = '',
    this.participantResponse = '',
    this.participantImpressionEmoji = '😐',
    this.imageUrl,
    this.problematicChannels,
  });

  // (Optionnel) Pour sérialisation plus tard
  Map<String, dynamic> toJson() => {
    'runId': runId,
    'notes': notes,
    'participantResponse': participantResponse,
    'participantImpressionEmoji': participantImpressionEmoji,
    'imageUrl': imageUrl,
    'problematicChannels': problematicChannels,
  };

  factory RunInfo.fromJson(Map<String, dynamic> json) => RunInfo(
    runId: json['runId'] as String,
    notes: (json['notes'] as String?) ?? '',
    participantResponse: (json['participantResponse'] as String?) ?? '',
    participantImpressionEmoji: (json['participantImpressionEmoji'] as String?) ?? '😐',
    imageUrl: json['imageUrl'] as String?,
    problematicChannels: json['problematicChannels'] as String?,
  );
}
